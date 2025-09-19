// content.js - Fixed version
let translationTooltip = null;
let isTooltipVisible = false;
let currentSelection = '';
let selectionTimeout = null;
let geminiInitialized = false;
let geminiLoadPromise = null;
let translationEnabled = true;
let autoTranslateOnSelection = false; // Changed default to false

if (chrome.storage && chrome.storage.onChanged) {
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.geminiApiKey) {
      console.log('🔄 API key updated, reinitializing Gemini...');
      geminiInitialized = false;
      geminiLoadPromise = null;
      
      if (window.geminiAI && changes.geminiApiKey.newValue) {
        window.geminiAI.apiKey = changes.geminiApiKey.newValue;
        window.geminiAI.initialized = true;
        geminiInitialized = true;
        console.log('✅ Gemini API key updated in content script');
      }
    }
  });
}

async function loadSettings() {
  try {
    const result = await chrome.storage.local.get(['extensionSettings']);
    const settings = result.extensionSettings || {};
    
    // Fixed: Default to false for auto-translate to prevent unwanted popups
    autoTranslateOnSelection = settings.autoTranslateOnSelection === true;
    translationEnabled = settings.translationEnabled !== false;
    
    console.log('Settings loaded:', { autoTranslateOnSelection, translationEnabled });
  } catch (error) {
    console.log('Could not load settings:', error);
    // Fallback defaults
    autoTranslateOnSelection = false;
    translationEnabled = true;
  }
}

// Call this when content script loads
loadSettings();

// Add message listener for settings updates
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'reload-settings':
      loadSettings(); // Reload settings when changed
      sendResponse({ success: true });
      break;
      
    case 'translate':
      handleContextMenuTranslation(request);
      sendResponse({ success: true });
      break;
      
    case 'ai-enhance':
      handleContextMenuAIEnhancement(request);
      sendResponse({ success: true });
      break;
      
    case 'translate-selection-shortcut':
      handleKeyboardShortcut();
      sendResponse({ success: true });
      break;
      
    case 'toggle-tooltip':
      toggleTooltipVisibility();
      sendResponse({ success: true });
      break;
      
    default:
      sendResponse({ error: 'Unknown action' });
  }
  
  return true;
});

// Single Gemini initialization function
async function initializeGemini() {
  if (geminiLoadPromise) {
    return geminiLoadPromise;
  }
  
  if (window.geminiAI && window.geminiAI.initialized) {
    geminiInitialized = true;
    return true;
  }

  geminiLoadPromise = new Promise(async (resolve, reject) => {
    try {
      console.log('🔍 Initializing Gemini in content script...');
      
      // Enhanced API key retrieval with multiple attempts
      let apiKey = null;
      let attempts = 0;
      const maxAttempts = 5;
      
      while (!apiKey && attempts < maxAttempts) {
        try {
          const result = await chrome.storage.local.get(['geminiApiKey']);
          apiKey = result.geminiApiKey;
          console.log(`Attempt ${attempts + 1}: API key found:`, !!apiKey);
          
          if (!apiKey) {
            // Wait a bit and try again
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (error) {
          console.error(`Storage access attempt ${attempts + 1} failed:`, error);
        }
        attempts++;
      }
      
      if (!apiKey) {
        console.log('❌ No API key found after multiple attempts');
        resolve(false);
        return;
      }
      
      console.log('✅ API key retrieved, loading Gemini service...');
      
      // Load script only if not already present
      if (!document.querySelector('script[src*="gemini-service.js"]')) {
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('gemini-service.js');
        
        script.onload = async () => {
          console.log('📜 Gemini script loaded, waiting for service...');
          let serviceAttempts = 0;
          while (!window.geminiAI && serviceAttempts < 20) {
            await new Promise(resolve => setTimeout(resolve, 250));
            serviceAttempts++;
          }
          
          if (window.geminiAI) {
            window.geminiAI.apiKey = apiKey;
            window.geminiAI.initialized = true;
            geminiInitialized = true;
            console.log('✅ Gemini AI fully initialized with API key');
            resolve(true);
          } else {
            console.log('❌ window.geminiAI not available after loading');
            resolve(false);
          }
        };
        
        script.onerror = () => {
          console.error('❌ Failed to load gemini-service.js');
          resolve(false);
        };
        
        document.head.appendChild(script);
      } else {
        // Script already loaded, just initialize
        if (window.geminiAI) {
          window.geminiAI.apiKey = apiKey;
          window.geminiAI.initialized = true;
          geminiInitialized = true;
          console.log('✅ Gemini AI re-initialized with existing script');
          resolve(true);
        } else {
          console.log('❌ Script loaded but window.geminiAI not available');
          resolve(false);
        }
      }
    } catch (error) {
      console.error('❌ Gemini initialization error:', error);
      resolve(false);
    }
  });
  
  return geminiLoadPromise;
}

initializeGemini();

setTimeout(() => {
  initializeTextSelection();
}, 1000);

function initializeTextSelection() {
  createTranslationTooltip();
  
  document.addEventListener('mouseup', handleTextSelection);
  document.addEventListener('keyup', handleTextSelection);
  document.addEventListener('click', handleClickOutside);
  document.addEventListener('keydown', handleKeyboardShortcuts);
}

function createTranslationTooltip() {
  if (translationTooltip) return;
  
  translationTooltip = document.createElement('div');
  translationTooltip.id = 'arabic-translator-tooltip';
  translationTooltip.className = 'translator-tooltip hidden';
  
  translationTooltip.innerHTML = `
    <div class="tooltip-header">
      <span class="tooltip-title">🌐 Quick Translate</span>
      <div class="tooltip-controls">
        <button class="tooltip-btn tooltip-swap" title="Swap Languages">⇄</button>
        <button class="tooltip-btn tooltip-close" title="Close">✕</button>
      </div>
    </div>
    
    <div class="tooltip-content">
      <div class="language-selector">
        <select class="lang-select" id="source-lang">
          <option value="ar">العربية</option>
          <option value="en">English</option>
        </select>
        <span class="arrow">→</span>
        <select class="lang-select" id="target-lang">
          <option value="en">English</option>
          <option value="ar">العربية</option>
        </select>
      </div>
      
      <div class="selected-text">
        <div class="text-label">Selected Text:</div>
        <div class="text-content" id="selected-text"></div>
      </div>
      
      <div class="translation-result">
        <div class="text-label">Translation:</div>
        <div class="text-content" id="translation-result">
          <div class="loading-spinner hidden">Translating...</div>
          <div class="translation-text"></div>
        </div>
      </div>
      
      <div class="tooltip-actions">
        <button class="action-btn copy-btn" title="Copy Translation">📋 Copy</button>
        <button class="action-btn speak-btn" title="Speak Translation">🔊 Speak</button>
        <button class="action-btn ai-btn" title="AI Enhancement">✨ AI Enhance</button>
      </div>
      
      <div class="ai-enhancement hidden">
        <div class="enhancement-content"></div>
      </div>
    </div>
  `;
  
  document.body.appendChild(translationTooltip);
  addTooltipEventListeners();
}

function addTooltipEventListeners() {
  // Fixed: More robust close button handling
  const closeBtn = translationTooltip.querySelector('.tooltip-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      hideTooltip();
    });
  }
  
  // Swap languages
  const swapBtn = translationTooltip.querySelector('.tooltip-swap');
  if (swapBtn) {
    swapBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      swapLanguages();
    });
  }
  
  // Language selectors
  const sourceLang = translationTooltip.querySelector('#source-lang');
  const targetLang = translationTooltip.querySelector('#target-lang');
  if (sourceLang) sourceLang.addEventListener('change', retranslate);
  if (targetLang) targetLang.addEventListener('change', retranslate);
  
  // Action buttons
  const copyBtn = translationTooltip.querySelector('.copy-btn');
  const speakBtn = translationTooltip.querySelector('.speak-btn');
  const aiBtn = translationTooltip.querySelector('.ai-btn');
  
  if (copyBtn) {
    copyBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      copyTranslation();
    });
  }
  
  if (speakBtn) {
    speakBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      speakTranslation();
    });
  }
  
  if (aiBtn) {
    aiBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      enhanceWithAI();
    });
  }
  
  // Prevent tooltip from closing when clicking inside
  translationTooltip.addEventListener('click', (e) => {
    e.stopPropagation();
  });
}

function handleTextSelection(event) {
  // Fixed: Check both settings properly
  if (!translationEnabled) {
    return;
  }
  
  // Only auto-show if the setting is enabled
  if (!autoTranslateOnSelection) {
    return;
  }
  
  if (selectionTimeout) {
    clearTimeout(selectionTimeout);
  }
  
  selectionTimeout = setTimeout(() => {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    if (selectedText && selectedText.length > 0 && selectedText.length < 1000) {
      currentSelection = selectedText;
      showTooltip(event, selectedText);
    } else if (selectedText.length === 0) {
      hideTooltip();
    }
  }, 100);
}

function showTooltip(event, text) {
  if (!translationTooltip) return;
  
  translationTooltip.querySelector('#selected-text').textContent = text;
  
  const translationResult = translationTooltip.querySelector('.translation-text');
  const loadingSpinner = translationTooltip.querySelector('.loading-spinner');
  translationResult.textContent = '';
  loadingSpinner.classList.add('hidden');
  
  const isArabic = /[\u0600-\u06FF]/.test(text);
  const sourceLang = translationTooltip.querySelector('#source-lang');
  const targetLang = translationTooltip.querySelector('#target-lang');
  
  if (isArabic) {
    sourceLang.value = 'ar';
    targetLang.value = 'en';
  } else {
    sourceLang.value = 'en';
    targetLang.value = 'ar';
  }
  
  positionTooltip(event);
  
  translationTooltip.classList.remove('hidden');
  isTooltipVisible = true;
  
  translateText(text);
}

function positionTooltip(event) {
  const selection = window.getSelection();
  let x = event.clientX;
  let y = event.clientY;
  
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    x = rect.left + (rect.width / 2);
    y = rect.bottom + 10;
  }
  
  const tooltipRect = translationTooltip.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  if (x + 200 > viewportWidth) {
    x = viewportWidth - 220;
  }
  if (x < 10) {
    x = 10;
  }
  
  if (y + 300 > viewportHeight) {
    y = event.clientY - 320;
  }
  if (y < 10) {
    y = 10;
  }
  
  translationTooltip.style.left = x + 'px';
  translationTooltip.style.top = y + 'px';
}

// Fixed: More robust hide function
function hideTooltip() {
  if (translationTooltip && isTooltipVisible) {
    translationTooltip.classList.add('hidden');
    const aiEnhancement = translationTooltip.querySelector('.ai-enhancement');
    if (aiEnhancement) {
      aiEnhancement.classList.add('hidden');
    }
    isTooltipVisible = false;
    console.log('Tooltip hidden');
  }
}

function handleClickOutside(event) {
  if (isTooltipVisible && translationTooltip && !translationTooltip.contains(event.target)) {
    hideTooltip();
  }
}

function handleKeyboardShortcuts(event) {
  // Ctrl+Shift+T always works regardless of auto-translate setting
  if (event.ctrlKey && event.shiftKey && event.key === 'T') {
    event.preventDefault();
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    if (selectedText) {
      currentSelection = selectedText;
      showTooltip(event, selectedText);
    }
  }
  
  // Escape to hide tooltip
  if (event.key === 'Escape' && isTooltipVisible) {
    event.preventDefault();
    hideTooltip();
  }
}

// ... (rest of your functions remain the same)
async function translateText(text) {
  const loadingSpinner = translationTooltip.querySelector('.loading-spinner');
  const translationResult = translationTooltip.querySelector('.translation-text');
  const sourceLang = translationTooltip.querySelector('#source-lang').value;
  const targetLang = translationTooltip.querySelector('#target-lang').value;
  
  if (sourceLang === targetLang) {
    translationResult.textContent = text;
    return;
  }
  
  loadingSpinner.classList.remove('hidden');
  
  try {
    let translation = await translateViaAPI(text, sourceLang, targetLang);
    
    if (!translation) {
      translation = await demoTranslate(text, sourceLang, targetLang);
    }
    
    if (!translation) {
      translation = text + ' (translation unavailable)';
    }
    
    translationResult.textContent = translation;
    
    saveTranslationToHistory({
      originalText: text,
      translatedText: translation,
      sourceLanguage: sourceLang,
      targetLanguage: targetLang,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Translation error:', error);
    translationResult.textContent = text + ' (translation failed)';
  } finally {
    loadingSpinner.classList.add('hidden');
  }
}

async function translateViaAPI(text, from, to) {
  try {
    const response = await fetch(`https://lingva.ml/api/v1/${from}/${to}/${encodeURIComponent(text)}`);
    if (response.ok) {
      const data = await response.json();
      if (data?.translation) return data.translation;
    }
  } catch (error) {
    console.log('Lingva failed:', error);
  }
  
  try {
    const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`);
    if (response.ok) {
      const data = await response.json();
      const translation = data?.responseData?.translatedText;
      if (translation && typeof translation === 'string') return translation;
    }
  } catch (error) {
    console.log('MyMemory failed:', error);
  }
  
  return null;
}

async function demoTranslate(text, from, to) {
  const demoMap = {
    'ar': {
      'en': {
        'مرحبا': 'Hello',
        'شكرا': 'Thank you',
        'السلام عليكم': 'Peace be upon you',
        'كيف حالك': 'How are you',
        'أهلا وسهلا': 'Welcome'
      }
    },
    'en': {
      'ar': {
        'hello': 'مرحبا',
        'thank you': 'شكرا',
        'peace be upon you': 'السلام عليكم',
        'how are you': 'كيف حالك',
        'welcome': 'أهلا وسهلا'
      }
    }
  };
  
  const key = text.toLowerCase().trim();
  return demoMap[from]?.[to]?.[key] || null;
}

function swapLanguages() {
  const sourceLang = translationTooltip.querySelector('#source-lang');
  const targetLang = translationTooltip.querySelector('#target-lang');
  
  const temp = sourceLang.value;
  sourceLang.value = targetLang.value;
  targetLang.value = temp;
  
  retranslate();
}

function retranslate() {
  if (currentSelection) {
    translateText(currentSelection);
  }
}

function copyTranslation() {
  const translationText = translationTooltip.querySelector('.translation-text').textContent;
  if (translationText) {
    navigator.clipboard.writeText(translationText).then(() => {
      const copyBtn = translationTooltip.querySelector('.copy-btn');
      const originalText = copyBtn.textContent;
      copyBtn.textContent = '✓ Copied!';
      setTimeout(() => {
        copyBtn.textContent = originalText;
      }, 1500);
    });
  }
}

function speakTranslation() {
  const translationText = translationTooltip.querySelector('.translation-text').textContent;
  const targetLang = translationTooltip.querySelector('#target-lang').value;
  
  if (translationText && window.speechSynthesis) {
    const utterance = new SpeechSynthesisUtterance(translationText);
    utterance.lang = targetLang === 'ar' ? 'ar-SA' : 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }
}

async function enhanceWithAI() {
  const originalText = currentSelection;
  const translationText = translationTooltip.querySelector('.translation-text').textContent;
  const sourceLang = translationTooltip.querySelector('#source-lang').value;
  const targetLang = translationTooltip.querySelector('#target-lang').value;
  
  if (!originalText || !translationText) return;
  
  const aiEnhancement = translationTooltip.querySelector('.ai-enhancement');
  const enhancementContent = translationTooltip.querySelector('.enhancement-content');
  
  enhancementContent.innerHTML = '<div class="loading-spinner">AI is analyzing...</div>';
  aiEnhancement.classList.remove('hidden');
  
  try {
    console.log('🧠 Starting AI enhancement...');
    
    // Force re-initialization if not working
    if (!geminiInitialized || !window.geminiAI || !window.geminiAI.initialized) {
      console.log('🔄 Gemini not ready, initializing...');
      geminiLoadPromise = null; // Reset promise
      const initialized = await initializeGemini();
      
      if (!initialized) {
        throw new Error('API key not found. Please set your Gemini API key in the extension settings.');
      }
    }

    // Double-check everything is ready
    if (!window.geminiAI) {
      throw new Error('Gemini service not loaded. Please refresh the page and try again.');
    }
    
    if (!window.geminiAI.apiKey) {
      throw new Error('API key missing. Please check your extension settings.');
    }
    
    console.log('✅ Calling Gemini API for enhancement...');
    
    const sourceLangName = sourceLang === 'ar' ? 'Arabic' : 'English';
    const targetLangName = targetLang === 'ar' ? 'Arabic' : 'English';
    
    const result = await window.geminiAI.enhanceTranslation(
      originalText,
      translationText,
      sourceLangName,
      targetLangName
    );
    
    console.log('✅ AI enhancement successful');
    
    enhancementContent.innerHTML = `
      <div class="ai-result">
        <h4>✨ Enhanced Translation</h4>
        <div class="enhanced-text">${result.enhanced_translation || translationText}</div>
        
        ${result.cultural_notes ? `
          <div class="cultural-notes">
            <strong>🌍 Cultural Context:</strong>
            <p>${result.cultural_notes}</p>
          </div>
        ` : ''}
        
        ${result.alternatives && result.alternatives.length > 0 ? `
          <div class="alternatives">
            <strong>🔄 Alternative Translations:</strong>
            <ul>
              ${result.alternatives.map(alt => `<li>${alt}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        
        <div class="confidence-info">
          <span>📝 ${result.formality || 'neutral'} tone</span>
          <span>🎯 ${result.confidence || 'medium'} confidence</span>
        </div>
      </div>
    `;
    
  } catch (error) {
    console.error('❌ AI enhancement failed:', error);
    
    let helpMessage = 'Try refreshing the page and setting your API key again.';
    if (error.message.includes('API key')) {
      helpMessage = 'Click the extension icon → Settings (⚙️) → Enter your Gemini API key';
    }
    
    enhancementContent.innerHTML = `
      <div class="ai-error">
        ❌ ${error.message}
        <br><small>${helpMessage}</small>
      </div>
    `;
  }
}

async function saveTranslationToHistory(translationData) {
  try {
    const result = await chrome.storage.local.get(['translationHistory']);
    const history = result.translationHistory || [];
    const newHistory = [translationData, ...history].slice(0, 50);
    await chrome.storage.local.set({ translationHistory: newHistory });
  } catch (error) {
    console.log('Could not save translation history:', error);
  }
}

// Additional context menu and keyboard shortcut handlers
async function handleContextMenuTranslation(request) {
  const { text, sourceLang, targetLang } = request;
  
  const fakeEvent = {
    clientX: window.innerWidth / 2,
    clientY: window.innerHeight / 2
  };
  
  currentSelection = text;
  showTooltip(fakeEvent, text);
  
  if (translationTooltip) {
    translationTooltip.querySelector('#source-lang').value = sourceLang;
    translationTooltip.querySelector('#target-lang').value = targetLang;
  }
  
  await translateText(text);
}

async function handleContextMenuAIEnhancement(request) {
  const { text, type } = request;
  
  const fakeEvent = {
    clientX: window.innerWidth / 2,
    clientY: window.innerHeight / 2
  };
  
  currentSelection = text;
  showTooltip(fakeEvent, text);
  
  const isArabic = /[\u0600-\u06FF]/.test(text);
  const sourceLang = isArabic ? 'ar' : 'en';
  const targetLang = isArabic ? 'en' : 'ar';
  
  if (translationTooltip) {
    translationTooltip.querySelector('#source-lang').value = sourceLang;
    translationTooltip.querySelector('#target-lang').value = targetLang;
  }
  
  await translateText(text);
  
  setTimeout(async () => {
    switch (type) {
      case 'enhance':
        await enhanceWithAI();
        break;
      case 'grammar':
        break;
      case 'pronunciation':
        break;
    }
  }, 1000);
}

function handleKeyboardShortcut() {
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();
  
  if (selectedText) {
    const fakeEvent = {
      clientX: window.innerWidth / 2,
      clientY: window.innerHeight / 2
    };
    
    currentSelection = selectedText;
    showTooltip(fakeEvent, selectedText);
  }
}

function toggleTooltipVisibility() {
  if (isTooltipVisible) {
    hideTooltip();
  } else {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    if (selectedText) {
      const fakeEvent = {
        clientX: window.innerWidth / 2,
        clientY: window.innerHeight / 2
      };
      
      currentSelection = selectedText;
      showTooltip(fakeEvent, selectedText);
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeTextSelection);
} else {
  initializeTextSelection();
}