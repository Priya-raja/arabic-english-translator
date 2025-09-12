import React, { useState, useEffect } from 'react'
import VoiceTranslator from './components/VoiceTranslator'

export default function App() {
  const [activeTab, setActiveTab] = useState('translate')
  const [translations, setTranslations] = useState([])

  useEffect(() => {
    chrome.storage?.local.get(['translations'], (result) => {
      if (result.translations) setTranslations(result.translations)
    })
  }, [])

  const saveTranslation = (t) => {
    const next = [t, ...translations].slice(0, 50)
    setTranslations(next)
    chrome.storage?.local.set({ translations: next })
  }

  return (
    <div>
      <div className="header">
        <h1 className="header__title">Arabic-English Translator</h1>
        <div className="header__tabs">
          <button onClick={() => setActiveTab('translate')} className={`tab ${activeTab==='translate'?'tab--active':''}`}>Translate</button>
        </div>
      </div>
      <div className="container">
        {activeTab==='translate' && (
          <VoiceTranslator onTranslation={saveTranslation} />
        )}
      </div>
    </div>
  )
}
