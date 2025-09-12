import React, { useEffect, useRef, useState } from 'react'

const LANGS = [
  { code: 'ar-SA', label: 'Arabic (Saudi)' },
  { code: 'ar-EG', label: 'Arabic (Egypt)' },
  { code: 'en-US', label: 'English (US)' },
  { code: 'en-GB', label: 'English (UK)' },
]

export default function VoiceTranslator({ onTranslation }) {
  const [isRecording, setIsRecording] = useState(false)
  const [sourceLang, setSourceLang] = useState('ar-SA')
  const [targetLang, setTargetLang] = useState('en-US')
  const [transcript, setTranscript] = useState('')
  const [translation, setTranslation] = useState('')
  const [error, setError] = useState('')
  const [isTranslating, setIsTranslating] = useState(false)

  const recognitionRef = useRef(null)
  const latestTextRef = useRef('')

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      setError('SpeechRecognition not supported in this browser')
      return
    }
    const rec = new SR()
    rec.continuous = false
    rec.interimResults = true
    rec.lang = sourceLang

    rec.onstart = () => { setIsRecording(true); setError('') }
    rec.onerror = e => { setError(`Speech error: ${e.error}`); setIsRecording(false) }
    rec.onend = () => {
      setIsRecording(false)
      const finalText = (latestTextRef.current || '').trim()
      if (finalText) handleTranslate(finalText)
    }
    rec.onresult = (ev) => {
      let finalText = ''
      let interim = ''
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const txt = ev.results[i][0].transcript
        if (ev.results[i].isFinal) finalText += txt
        else interim += txt
      }
      const combined = (finalText || interim || '').trim()
      latestTextRef.current = combined
      setTranscript(combined)
    }

    recognitionRef.current = rec
    return () => rec.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceLang])

  const start = () => {
    if (!recognitionRef.current || isRecording) return
    setTranscript(''); setTranslation(''); setError('')
    latestTextRef.current = ''
    recognitionRef.current.lang = sourceLang
    recognitionRef.current.start()
  }
  const stop = () => {
    recognitionRef.current?.stop()
  }

  const handleTranslate = async (text) => {
    const trimmed = (text || '').trim()
    if (!trimmed) return
    setIsTranslating(true)
    try {
      const api = await translateViaAPI(trimmed, sourceLang, targetLang)
      const demo = api ? null : await demoTranslate(trimmed, sourceLang, targetLang)
      const result = api || demo || trimmed
      setTranslation(result)
      onTranslation?.({
        id: Date.now(),
        originalText: trimmed,
        translatedText: result,
        sourceLanguage: sourceLang,
        targetLanguage: targetLang,
        timestamp: new Date().toISOString()
      })
    } catch (e) {
      console.error('Translate error', e)
      setTranslation(trimmed)
      setError(e.message || 'Translation failed')
    } finally {
      setIsTranslating(false)
    }
  }

  const mapChromeToISO = (code) => {
    if (!code) return 'auto'
    if (code.startsWith('ar')) return 'ar'
    if (code.startsWith('en')) return 'en'
    return 'auto'
  }

  // Multi-endpoint translation with CORS-friendly services
  const translateViaAPI = async (text, from, to) => {
    const src = mapChromeToISO(from)
    const tgt = mapChromeToISO(to)
    if (!text) return null
    if (src === tgt) return text

    // 1) Lingva (Google frontend) - often CORS-friendly
    try {
      const r1 = await fetch(`https://lingva.ml/api/v1/${encodeURIComponent(src)}/${encodeURIComponent(tgt)}/${encodeURIComponent(text)}`)
      if (r1.ok) {
        const j = await r1.json()
        if (j?.translation) return j.translation
      }
    } catch {}

    // 2) MyMemory (no key, has rate limits)
    try {
      const r2 = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(src)}|${encodeURIComponent(tgt)}`)
      if (r2.ok) {
        const j = await r2.json()
        const t = j?.responseData?.translatedText
        if (t && typeof t === 'string') return t
      }
    } catch {}

    // 3) LibreTranslate mirrors (may require keys on some instances)
    const libreEndpoints = [
      'https://libretranslate.de/translate',
      'https://translate.argosopentech.com/translate'
    ]
    for (const url of libreEndpoints) {
      try {
        const r3 = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ q: text, source: src, target: tgt, format: 'text' })
        })
        if (!r3.ok) continue
        const j = await r3.json()
        if (j?.translatedText) return j.translatedText
      } catch {}
    }

    return null
  }

  const demoTranslate = async (text, from, to) => {
    const map = {
      'ar-SA': { 'en-US': { 'مرحبا': 'Hello', 'شكرا': 'Thank you', 'السلام عليكم': 'Peace be upon you' } },
      'en-US': { 'ar-SA': { 'hello': 'مرحبا', 'thank you': 'شكرا', 'peace be upon you': 'السلام عليكم' } },
    }
    const key = text.toLowerCase().trim()
    const found = map[from]?.[to]?.[key]
    return found || null
  }

  const speak = () => {
    if (!translation || !window.speechSynthesis) return
    const u = new SpeechSynthesisUtterance(translation)
    u.lang = targetLang
    u.rate = 0.9
    window.speechSynthesis.speak(u)
  }

  const swap = () => {
    setSourceLang(targetLang)
    setTargetLang(sourceLang)
    setTranscript('')
    setTranslation('')
    latestTextRef.current = ''
  }

  return (
    <div className="col" style={{ gap: 16 }}>
      <div className="row">
        <div className="col">
          <label className="field-label">From</label>
          <select value={sourceLang} onChange={e=>setSourceLang(e.target.value)} className="select">
            {LANGS.map(l=> <option key={l.code} value={l.code}>{l.label} ({l.code})</option>)}
          </select>
        </div>
        <button onClick={swap} className="btn btn--secondary" title="Swap">Swap</button>
        <div className="col">
          <label className="field-label">To</label>
          <select value={targetLang} onChange={e=>setTargetLang(e.target.value)} className="select">
            {LANGS.map(l=> <option key={l.code} value={l.code}>{l.label} ({l.code})</option>)}
          </select>
        </div>
      </div>

      <div className="mic-wrap">
        <button onClick={isRecording?stop:start} className={`mic ${isRecording? 'mic--rec':''}`} aria-label="Microphone">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
        </button>
        <span className={`mic__hint ${isRecording? 'mic__hint--rec':''}`}>{isRecording? 'Recording... click to stop' : 'Click microphone to speak'}</span>
      </div>

      {error && (<div className="alert">{error}</div>)}

      {transcript && (
        <div className="card">
          <div className="card__title">Input <span className="card__subtitle">{sourceLang}</span></div>
          <div>{transcript}</div>
        </div>
      )}

      {(isTranslating || translation) && (
        <div className="card">
          <div className="card__title">Translation <span className="card__subtitle">{targetLang}</span></div>
          <div>{isTranslating ? 'Translating…' : translation}</div>
          {!isTranslating && translation && (
            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={()=>navigator.clipboard.writeText(translation)} className="btn btn--secondary">Copy</button>
              <button onClick={speak} className="btn btn--primary">Speak</button>
            </div>
          )}
        </div>
      )}

      <div className="info">
        <h4>How to use</h4>
        <ul>
          <li>Click the microphone to start/stop</li>
          <li>Speak clearly in the source language</li>
          <li>Translation appears under "Translation" after you stop</li>
        </ul>
      </div>
    </div>
  )
}
