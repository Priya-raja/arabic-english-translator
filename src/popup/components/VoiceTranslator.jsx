import React, { useEffect, useRef, useState } from 'react'
import '../../gemini-service.js'

const LANGS = [
  { code: 'ar-SA', label: 'Arabic (Saudi)' },
  { code: 'ar-EG', label: 'Arabic (Egypt)' },
  { code: 'en-US', label: 'English (US)' },
  { code: 'en-GB', label: 'English (UK)' },
]

// AI Result Components
const EnhancementResult = ({ data }) => (
  <div className="ai-enhancement">
    <h4 style={{ color: '#2980b9', marginBottom: 12 }}>✨ Enhanced Translation</h4>
    
    <div style={{ background: '#f8f9fa', padding: 12, borderRadius: 8, marginBottom: 12 }}>
      <strong>Enhanced:</strong> {data.enhanced_translation}
    </div>
    
    {data.cultural_notes && (
      <div style={{ marginBottom: 12 }}>
        <strong>🌍 Cultural Context:</strong>
        <div style={{ marginTop: 4, color: '#555' }}>{data.cultural_notes}</div>
      </div>
    )}
    
    {data.alternatives && data.alternatives.length > 0 && (
      <div style={{ marginBottom: 12 }}>
        <strong>🔄 Alternatives:</strong>
        <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
          {data.alternatives.map((alt, idx) => (
            <li key={idx} style={{ marginBottom: 4 }}>{alt}</li>
          ))}
        </ul>
      </div>
    )}
    
    <div style={{ fontSize: 12, color: '#666', marginTop: 12 }}>
      <span style={{ marginRight: 16 }}>📝 {data.formality || 'neutral'} tone</span>
      <span>🎯 {data.confidence || 'medium'} confidence</span>
    </div>
  </div>
)

const GrammarResult = ({ data }) => (
  <div className="ai-grammar">
    <h4 style={{ color: '#e67e22', marginBottom: 12 }}>📚 Grammar Analysis</h4>
    
    {data.grammar_points && data.grammar_points.length > 0 && (
      <div style={{ marginBottom: 12 }}>
        <strong>Key Grammar Points:</strong>
        <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
          {data.grammar_points.map((point, idx) => (
            <li key={idx} style={{ marginBottom: 4 }}>{point}</li>
          ))}
        </ul>
      </div>
    )}
    
    {data.vocabulary && data.vocabulary.length > 0 && (
      <div style={{ marginBottom: 12 }}>
        <strong>Important Vocabulary:</strong>
        <div style={{ marginTop: 8 }}>
          {data.vocabulary.map((item, idx) => (
            <div key={idx} style={{ 
              background: '#f8f9fa', 
              padding: 8, 
              borderRadius: 4, 
              marginBottom: 4,
              border: '1px solid #e9ecef'
            }}>
              <strong>{item.word}:</strong> {item.meaning}
              {item.usage && <div style={{ fontSize: 12, fontStyle: 'italic', color: '#666' }}>Usage: {item.usage}</div>}
            </div>
          ))}
        </div>
      </div>
    )}
    
    {data.learning_tips && data.learning_tips.length > 0 && (
      <div>
        <strong>💡 Learning Tips:</strong>
        <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
          {data.learning_tips.map((tip, idx) => (
            <li key={idx} style={{ marginBottom: 4 }}>{tip}</li>
          ))}
        </ul>
      </div>
    )}
  </div>
)

const PronunciationResult = ({ data }) => (
  <div className="ai-pronunciation">
    <h4 style={{ color: '#9b59b6', marginBottom: 12 }}>📢 Pronunciation Guide</h4>
    
    {data.phonetic && (
      <div style={{ background: '#f8f9fa', padding: 12, borderRadius: 8, marginBottom: 12 }}>
        <strong>Phonetic:</strong> <code style={{ fontSize: 16 }}>{data.phonetic}</code>
      </div>
    )}
    
    {data.pronunciation_tips && data.pronunciation_tips.length > 0 && (
      <div style={{ marginBottom: 12 }}>
        <strong>Pronunciation Tips:</strong>
        <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
          {data.pronunciation_tips.map((tip, idx) => (
            <li key={idx} style={{ marginBottom: 4 }}>{tip}</li>
          ))}
        </ul>
      </div>
    )}
    
    {data.common_mistakes && data.common_mistakes.length > 0 && (
      <div>
        <strong>⚠️ Common Mistakes to Avoid:</strong>
        <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
          {data.common_mistakes.map((mistake, idx) => (
            <li key={idx} style={{ marginBottom: 4, color: '#e74c3c' }}>{mistake}</li>
          ))}
        </ul>
      </div>
    )}
  </div>
)

const SettingsModal = ({ onClose }) => {
  const [apiKey, setApiKey] = useState('')
  
  const saveApiKey = async () => {
    if (apiKey.trim()) {
      try {
        if (typeof window !== 'undefined' && typeof window.chrome !== 'undefined' && window.chrome.storage) {
          await window.chrome.storage.local.set({ geminiApiKey: apiKey.trim() })
        } else {
          localStorage.setItem('geminiApiKey', apiKey.trim())
        }
        window.geminiAI.apiKey = apiKey.trim()
        window.geminiAI.initialized = true
        alert('✅ API key saved successfully!')
        onClose()
      } catch (error) {
        alert('❌ Failed to save API key: ' + error.message)
      }
    }
  }
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        padding: 24,
        borderRadius: 12,
        width: '90%',
        maxWidth: 400,
        boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
      }}>
        <h3 style={{ marginBottom: 16, color: '#333' }}>⚙️ AI Settings</h3>
        
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
            Gemini API Key:
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your Gemini API key"
            style={{
              width: '100%',
              padding: 12,
              border: '2px solid #ddd',
              borderRadius: 8,
              fontSize: 14
            }}
          />
          <div style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
            Get your free API key from <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer">aistudio.google.com</a>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            className="btn btn--secondary"
          >
            Cancel
          </button>
          <button
            onClick={saveApiKey}
            className="btn btn--primary"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

// Conversation History Component
const ConversationHistory = ({ translations, onClearHistory }) => {
  if (!translations || translations.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: '#666', padding: 20 }}>
        No conversation history yet
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h4 style={{ margin: 0, fontSize: 14 }}>Recent Conversations</h4>
        <button 
          onClick={onClearHistory}
          className="btn btn--secondary"
          style={{ fontSize: 10, padding: '4px 8px' }}
        >
          Clear All
        </button>
      </div>
      
      <div style={{ maxHeight: 200, overflowY: 'auto' }}>
        {translations.slice(0, 10).map((item, idx) => (
          <div key={idx} style={{ 
            background: '#f8f9fa', 
            padding: 8, 
            borderRadius: 6, 
            marginBottom: 6,
            fontSize: 12,
            border: '1px solid #e9ecef'
          }}>
            <div style={{ fontWeight: 'bold', color: '#2980b9' }}>
              {item.sourceLanguage === 'ar-SA' ? '🇸🇦' : '🇺🇸'} → {item.targetLanguage === 'ar-SA' ? '🇸🇦' : '🇺🇸'}
            </div>
            <div style={{ margin: '4px 0' }}>{item.originalText}</div>
            <div style={{ color: '#666', fontStyle: 'italic' }}>{item.translatedText}</div>
            <div style={{ fontSize: 10, color: '#999', marginTop: 4 }}>
              {new Date(item.timestamp).toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Common Business Phrases Component
// Updated Common Business Phrases Component
const CommonPhrases = ({ onPhraseSelect }) => {
  const businessPhrases = [
    {
      category: "Greetings & Welcome",
      phrases: [
        { 
          ar: "أهلاً وسهلاً", 
          transliteration: "Ahlan wa sahlan",
          en: "Welcome", 
          usage: "General welcome" 
        },
        { 
          ar: "صباح الخير", 
          transliteration: "Sabah al-khayr",
          en: "Good morning", 
          usage: "Morning greeting" 
        },
        { 
          ar: "مساء الخير", 
          transliteration: "Masa al-khayr",
          en: "Good evening", 
          usage: "Evening greeting" 
        },
        { 
          ar: "كيف يمكنني مساعدتك؟", 
          transliteration: "Kayf yumkinuni musa'adatuka?",
          en: "How can I help you?", 
          usage: "Offering assistance" 
        }
      ]
    },
    {
      category: "Common Requests",
      phrases: [
        { 
          ar: "أريد أن أحجز موعد", 
          transliteration: "Ureed an uhjiz maw'id",
          en: "I want to book an appointment", 
          usage: "Appointment booking" 
        },
        { 
          ar: "أين المكتب؟", 
          transliteration: "Ayna al-maktab?",
          en: "Where is the office?", 
          usage: "Asking for directions" 
        },
        { 
          ar: "هل يمكنني الحصول على نسخة؟", 
          transliteration: "Hal yumkinuni al-husool ala nuskha?",
          en: "Can I get a copy?", 
          usage: "Document request" 
        },
        { 
          ar: "ما هي الأوراق المطلوبة؟", 
          transliteration: "Ma hiya al-awraq al-matlooba?",
          en: "What documents are required?", 
          usage: "Document inquiry" 
        },
        { 
          ar: "كم التكلفة؟", 
          transliteration: "Kam at-taklifa?",
          en: "How much does it cost?", 
          usage: "Price inquiry" 
        },
        { 
          ar: "متى سيكون جاهز؟", 
          transliteration: "Mata sayakoon jahiz?",
          en: "When will it be ready?", 
          usage: "Timeline question" 
        }
      ]
    },
    {
      category: "Assistance & Support",
      phrases: [
        { 
          ar: "لا أفهم", 
          transliteration: "La afham",
          en: "I don't understand", 
          usage: "Communication difficulty" 
        },
        { 
          ar: "هل تتكلم العربية؟", 
          transliteration: "Hal tatakallam al-arabiya?",
          en: "Do you speak Arabic?", 
          usage: "Language inquiry" 
        },
        { 
          ar: "هل يمكنك مساعدتي؟", 
          transliteration: "Hal yumkinuka musa'adati?",
          en: "Can you help me?", 
          usage: "Requesting help" 
        },
        { 
          ar: "أحتاج مترجم", 
          transliteration: "Ahtaj mutarjim",
          en: "I need a translator", 
          usage: "Translation request" 
        },
        { 
          ar: "من فضلك انتظر", 
          transliteration: "Min fadlika intazir",
          en: "Please wait", 
          usage: "Asking for patience" 
        }
      ]
    },
    {
      category: "Closing & Thanks",
      phrases: [
        { 
          ar: "شكراً لك", 
          transliteration: "Shukran laka",
          en: "Thank you", 
          usage: "Expressing gratitude" 
        },
        { 
          ar: "شكراً جزيلاً", 
          transliteration: "Shukran jazeelan",
          en: "Thank you very much", 
          usage: "Strong gratitude" 
        },
        { 
          ar: "مع السلامة", 
          transliteration: "Ma'a as-salama",
          en: "Goodbye", 
          usage: "Formal goodbye" 
        },
        { 
          ar: "إلى اللقاء", 
          transliteration: "Ila al-liqa",
          en: "See you later", 
          usage: "Casual goodbye" 
        },
        { 
          ar: "بارك الله فيك", 
          transliteration: "Barak Allah feeka",
          en: "May God bless you", 
          usage: "Religious thanks" 
        }
      ]
    }
  ]

  return (
    <div>
      <h4 style={{ margin: '0 0 12px 0', fontSize: 14 }}>Common Business Phrases</h4>
      
      {businessPhrases.map((category, catIdx) => (
        <div key={catIdx} style={{ marginBottom: 16 }}>
          <h5 style={{ 
            margin: '0 0 8px 0', 
            fontSize: 12, 
            color: '#2980b9',
            background: '#f0f8ff',
            padding: '4px 8px',
            borderRadius: 4
          }}>
            {category.category}
          </h5>
          
          {category.phrases.map((phrase, phraseIdx) => (
            <div 
              key={phraseIdx}
              onClick={() => onPhraseSelect(phrase)}
              style={{ 
                background: 'white',
                border: '1px solid #e0e0e0',
                borderRadius: 6, 
                padding: 10, 
                marginBottom: 6,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#f8f9fa'
                e.target.style.borderColor = '#3498db'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'white'
                e.target.style.borderColor = '#e0e0e0'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  {/* Main transliteration - easy to read */}
                  <div style={{ 
                    fontSize: 14, 
                    fontWeight: 'bold', 
                    color: '#2c3e50',
                    marginBottom: 2
                  }}>
                    {phrase.transliteration}
                  </div>
                  
                  {/* English translation */}
                  <div style={{ 
                    fontSize: 13, 
                    color: '#27ae60',
                    marginBottom: 2
                  }}>
                    {phrase.en}
                  </div>
                  
                  {/* Arabic script - smaller, for reference */}
                  <div style={{ 
                    fontSize: 11, 
                    color: '#7f8c8d',
                    fontStyle: 'italic'
                  }}>
                    Arabic: {phrase.ar}
                  </div>
                </div>
                
                <div style={{ 
                  fontSize: 10, 
                  color: '#999', 
                  textAlign: 'right',
                  marginLeft: 8,
                  minWidth: 80
                }}>
                  {phrase.usage}
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
      
      {/* Pronunciation Guide */}
      <div style={{ 
        background: '#f8f9fa', 
        border: '1px solid #e9ecef',
        borderRadius: 8, 
        padding: 12, 
        marginTop: 16,
        fontSize: 11,
        color: '#666'
      }}>
        <strong>📢 Pronunciation Tips:</strong>
        <ul style={{ margin: '4px 0', paddingLeft: 16 }}>
          <li><strong>kh</strong> = throat sound (like clearing throat)</li>
          <li><strong>q</strong> = deep 'k' sound from back of throat</li>
          <li><strong>gh</strong> = like French 'r' or gargling</li>
          <li><strong>'</strong> = glottal stop (brief pause)</li>
        </ul>
      </div>
    </div>
  )
}


export default function VoiceTranslator({ onTranslation }) {
  const [isRecording, setIsRecording] = useState(false)
  const [sourceLang, setSourceLang] = useState('ar-SA')
  const [targetLang, setTargetLang] = useState('en-US')
  const [transcript, setTranscript] = useState('')
  const [translation, setTranslation] = useState('')
  const [error, setError] = useState('')
  const [isTranslating, setIsTranslating] = useState(false)
  const [isAIProcessing, setIsAIProcessing] = useState(false)
const [aiResult, setAiResult] = useState(null)
const [aiError, setAiError] = useState('')
const [showSettings, setShowSettings] = useState(false)
const [activeTab, setActiveTab] = useState('translate') // Add this
const [allTranslations, setAllTranslations] = useState([]) // Add this

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


  // Add this useEffect after your existing useEffect
useEffect(() => {
  // Load translation history from storage
  const loadHistory = async () => {
    try {
      if (typeof window !== 'undefined' && window.chrome && window.chrome.storage) {
        const result = await window.chrome.storage.local.get(['translationHistory'])
        if (result.translationHistory) {
          setAllTranslations(result.translationHistory)
        }
      }
    } catch (error) {
      console.log('Could not load translation history')
    }
  }
  loadHistory()
}, [])
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
  setAiResult(null) // Clear previous AI results
  setAiError('')
  
  try {
    const api = await translateViaAPI(trimmed, sourceLang, targetLang)
    const demo = api ? null : await demoTranslate(trimmed, sourceLang, targetLang)
    const result = api || demo || trimmed
    setTranslation(result)
    
    // Create translation data object
    const translationData = {
      id: Date.now(),
      originalText: trimmed,
      translatedText: result,
      sourceLanguage: sourceLang,
      targetLanguage: targetLang,
      timestamp: new Date().toISOString()
    }

    // Save to parent component (if onTranslation callback exists)
    onTranslation?.(translationData)

    // Save to local history state
    const newHistory = [translationData, ...allTranslations].slice(0, 50) // Keep last 50
    setAllTranslations(newHistory)

    // Save to Chrome storage for persistence
    try {
      if (typeof window !== 'undefined' && window.chrome && window.chrome.storage) {
        await window.chrome.storage.local.set({ translationHistory: newHistory })
      }
    } catch (storageError) {
      console.log('Could not save translation history:', storageError)
    }
    
  } catch (e) {
    console.error('Translate error', e)
    setTranslation(trimmed)
    setError(e.message || 'Translation failed')
  } finally {
    setIsTranslating(false)
  }
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

const mapChromeToISO = (code) => {
  if (!code) return 'auto'
  if (code.startsWith('ar')) return 'ar'
  if (code.startsWith('en')) return 'en'
  return 'auto'
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

  // AI Enhancement Functions
const handleAIEnhance = async () => {
  if (!transcript || !translation) return
  
  setIsAIProcessing(true)
  setAiError('')
  
  try {
    const sourceLangName = sourceLang.startsWith('ar') ? 'Arabic' : 'English'
    const targetLangName = targetLang.startsWith('ar') ? 'Arabic' : 'English'
    
    const result = await window.geminiAI.enhanceTranslation(
      transcript,
      translation,
      sourceLangName,
      targetLangName
    )
    
    setAiResult({ type: 'enhancement', data: result })
  } catch (error) {
    setAiError(error.message)
  } finally {
    setIsAIProcessing(false)
  }
}

const handleGrammarAnalysis = async () => {
  if (!transcript) return
  
  setIsAIProcessing(true)
  setAiError('')
  
  try {
    const language = sourceLang.startsWith('ar') ? 'Arabic' : 'English'
    const result = await window.geminiAI.explainGrammar(transcript, language)
    setAiResult({ type: 'grammar', data: result })
  } catch (error) {
    setAiError(error.message)
  } finally {
    setIsAIProcessing(false)
  }
}

const handlePronunciation = async () => {
  if (!transcript) return
  
  setIsAIProcessing(true)
  setAiError('')
  
  try {
    const language = sourceLang.startsWith('ar') ? 'Arabic' : 'English'
    const result = await window.geminiAI.getPronunciationHelp(transcript, language)
    setAiResult({ type: 'pronunciation', data: result })
  } catch (error) {
    setAiError(error.message)
  } finally {
    setIsAIProcessing(false)
  }
}

const clearHistory = async () => {
  setAllTranslations([])
  try {
    if (typeof window !== 'undefined' && window.chrome && window.chrome.storage) {
      await window.chrome.storage.local.set({ translationHistory: [] })
    }
  } catch (error) {
    console.log('Could not clear history')
  }
}

const handlePhraseSelect = (phrase) => {
  // Auto-fill the selected phrase for translation
  setTranscript(phrase.ar)
  latestTextRef.current = phrase.ar
  handleTranslate(phrase.ar)
}

 return (
  <div className="col" style={{ gap: 16 }}>
    {/* Navigation Tabs */}
    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
      <button 
        onClick={() => setActiveTab('translate')}
        className={`btn ${activeTab === 'translate' ? 'btn--primary' : 'btn--secondary'}`}
        style={{ fontSize: 12, padding: '6px 12px' }}
      >
        🎤 Translate
      </button>
      <button 
        onClick={() => setActiveTab('history')}
        className={`btn ${activeTab === 'history' ? 'btn--primary' : 'btn--secondary'}`}
        style={{ fontSize: 12, padding: '6px 12px' }}
      >
        📝 History
      </button>
      <button 
        onClick={() => setActiveTab('phrases')}
        className={`btn ${activeTab === 'phrases' ? 'btn--primary' : 'btn--secondary'}`}
        style={{ fontSize: 12, padding: '6px 12px' }}
      >
        💬 Common Phrases
      </button>
    </div>

    {/* Translation Tab */}
    {activeTab === 'translate' && (
      <>
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

        {/* AI Enhancement Section */}
        {translation && (
          <div className="card ai-card">
            <div className="card__title">🧠 AI Enhancement <span className="card__subtitle">Powered by Gemini Flash 2.0</span></div>
            
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <button 
                onClick={() => handleAIEnhance()}
                className="btn btn--ai"
                disabled={isAIProcessing}
              >
                ✨ AI Enhance
              </button>
              <button 
                onClick={() => handleGrammarAnalysis()}
                className="btn btn--ai"
                disabled={isAIProcessing}
              >
                🎓 Grammar
              </button>
              <button 
                onClick={() => handlePronunciation()}
                className="btn btn--ai"
                disabled={isAIProcessing}
              >
                📢 Pronunciation
              </button>
              <button 
                onClick={() => setShowSettings(true)}
                className="btn btn--secondary"
                style={{ marginLeft: 'auto' }}
              >
                ⚙️
              </button>
            </div>

            {isAIProcessing && (
              <div style={{ textAlign: 'center', padding: 16, color: '#666' }}>
                <div className="spinner"></div>
                <div style={{ marginTop: 8 }}>AI is analyzing...</div>
              </div>
            )}

            {aiResult && (
              <div className="ai-result">
                {aiResult.type === 'enhancement' && <EnhancementResult data={aiResult.data} />}
                {aiResult.type === 'grammar' && <GrammarResult data={aiResult.data} />}
                {aiResult.type === 'pronunciation' && <PronunciationResult data={aiResult.data} />}
              </div>
            )}

            {aiError && (
              <div style={{ color: '#e74c3c', padding: 12, background: '#ffeaea', borderRadius: 8, fontSize: 14 }}>
                ❌ {aiError}
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
      </>
    )}

    {/* History Tab */}
    {activeTab === 'history' && (
      <div className="card">
        <ConversationHistory 
          translations={allTranslations} 
          onClearHistory={clearHistory}
        />
      </div>
    )}

    {/* Common Phrases Tab */}
    {activeTab === 'phrases' && (
      <div className="card" style={{ maxHeight: 400, overflowY: 'auto' }}>
        <CommonPhrases onPhraseSelect={handlePhraseSelect} />
      </div>
    )}

    {/* Settings Modal */}
    {showSettings && (
      <SettingsModal onClose={() => setShowSettings(false)} />
    )}
  </div>
)
}
