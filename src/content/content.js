// content.js - Handles text selection on webpages
let translationTooltip = null;
let isTooltipVisible = false;
let currentSelection = '';
let selectionTimeout = null;


// Import Gemini service for translation
const script = document.createElement('script');
script.src = chrome.runtime.getURL('gemini-service.js');
document.head.appendChild(script);

// Initialize after Gemini service loads
setTimeout(() => {
  initializeTextSelection();
}, 1000);

function initializeTextSelection() {
  // Create translation tooltip element
  createTranslationTooltip();
  
  // Listen for text selection
  document.addEventListener('mouseup', handleTextSelection);
  document.addEventListener('keyup', handleTextSelection);
  
  // Hide tooltip when clicking elsewhere
  document.addEventListener('click', handleClickOutside);
  
  // Handle keyboard shortcuts
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
  
  // Add event listeners
  addTooltipEventListeners();
}

function addTooltipEventListeners() {
  // Close button
  translationTooltip.querySelector('.tooltip-close').addEventListener('click', hideTooltip);
  
  // Swap languages
  translationTooltip.querySelector('.tooltip-swap').addEventListener('click', swapLanguages);
  
  // Language selectors
  translationTooltip.querySelector('#source-lang').addEventListener('change', retranslate);
  translationTooltip.querySelector('#target-lang').addEventListener('change', retranslate);
  
  // Action buttons
  translationTooltip.querySelector('.copy-btn').addEventListener('click', copyTranslation);
  translationTooltip.querySelector('.speak-btn').addEventListener('click', speakTranslation);
  translationTooltip.querySelector('.ai-btn').addEventListener('click', enhanceWithAI);
  
  // Prevent tooltip from closing when clicking inside
  translationTooltip.addEventListener('click', (e) => e.stopPropagation());
}

function handleTextSelection(event) {
  // Clear previous timeout
  if (selectionTimeout) {
    clearTimeout(selectionTimeout);
  }
  
  // Add small delay to ensure selection is complete
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
  
  // Update selected text display
  translationTooltip.querySelector('#selected-text').textContent = text;
  
  // Clear previous translation
  const translationResult = translationTooltip.querySelector('.translation-text');
  const loadingSpinner = translationTooltip.querySelector('.loading-spinner');
  translationResult.textContent = '';
  loadingSpinner.classList.add('hidden');
  
  // Auto-detect language and set selectors
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
  
  // Position tooltip near selection
  positionTooltip(event);
  
  // Show tooltip
  translationTooltip.classList.remove('hidden');
  isTooltipVisible = true;
  
  // Start translation
  translateText(text);
}

function positionTooltip(event) {
  const selection = window.getSelection();
  let x = event.clientX;
  let y = event.clientY;
  
  // Try to get selection rectangle for better positioning
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    x = rect.left + (rect.width / 2);
    y = rect.bottom + 10;
  }
  
  // Ensure tooltip stays within viewport
  const tooltipRect = translationTooltip.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  // Adjust horizontal position
  if (x + 200 > viewportWidth) {
    x = viewportWidth - 220;
  }
  if (x < 10) {
    x = 10;
  }
  
  // Adjust vertical position
  if (y + 300 > viewportHeight) {
    y = event.clientY - 320; // Show above selection
  }
  if (y < 10) {
    y = 10;
  }
  
  translationTooltip.style.left = x + 'px';
  translationTooltip.style.top = y + 'px';
}

function hideTooltip() {
  if (translationTooltip) {
    translationTooltip.classList.add('hidden');
    translationTooltip.querySelector('.ai-enhancement').classList.add('hidden');
    isTooltipVisible = false;
  }
}

function handleClickOutside(event) {
  if (isTooltipVisible && !translationTooltip.contains(event.target)) {
    hideTooltip();
  }
}

function handleKeyboardShortcuts(event) {
  // Ctrl+Shift+T to translate selected text
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
    hideTooltip();
  }
}

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
    // Try API translation first
    let translation = await translateViaAPI(text, sourceLang, targetLang);
    
    // Fallback to demo translation
    if (!translation) {
      translation = await demoTranslate(text, sourceLang, targetLang);
    }
    
    // Final fallback
    if (!translation) {
      translation = text + ' (translation unavailable)';
    }
    
    translationResult.textContent = translation;
    
    // Save to history
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
  // Use the same translation logic from your main component
  try {
    // Lingva Translate
    const response = await fetch(`https://lingva.ml/api/v1/${from}/${to}/${encodeURIComponent(text)}`);
    if (response.ok) {
      const data = await response.json();
      if (data?.translation) return data.translation;
    }
  } catch (error) {
    console.log('Lingva failed:', error);
  }
  
  try {
    // MyMemory
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
      // Show brief feedback
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
    // Check if Gemini AI is available
    if (typeof window.geminiAI === 'undefined') {
      throw new Error('Gemini AI not initialized. Please set up your API key.');
    }
    
    const sourceLangName = sourceLang === 'ar' ? 'Arabic' : 'English';
    const targetLangName = targetLang === 'ar' ? 'Arabic' : 'English';
    
    const result = await window.geminiAI.enhanceTranslation(
      originalText,
      translationText,
      sourceLangName,
      targetLangName
    );
    
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
    enhancementContent.innerHTML = `
      <div class="ai-error">
        ❌ AI Enhancement failed: ${error.message}
        <br><small>Make sure to set up your Gemini API key in the extension settings.</small>
      </div>
    `;
  }
}

async function saveTranslationToHistory(translationData) {
  try {
    const result = await chrome.storage.local.get(['translationHistory']);
    const history = result.translationHistory || [];
    const newHistory = [translationData, ...history].slice(0, 50); // Keep last 50
    await chrome.storage.local.set({ translationHistory: newHistory });
  } catch (error) {
    console.log('Could not save translation history:', error);
  }
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
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
  
  return true; // Keep message channel open
});

// Handle context menu translation
async function handleContextMenuTranslation(request) {
  const { text, sourceLang, targetLang } = request;
  
  // Create a fake event object for positioning
  const fakeEvent = {
    clientX: window.innerWidth / 2,
    clientY: window.innerHeight / 2
  };
  
  // Set current selection
  currentSelection = text;
  
  // Show tooltip with translation
  showTooltip(fakeEvent, text);
  
  // Set the language selectors
  if (translationTooltip) {
    translationTooltip.querySelector('#source-lang').value = sourceLang;
    translationTooltip.querySelector('#target-lang').value = targetLang;
  }
  
  // Translate
  await translateText(text);
}

// Handle context menu AI enhancement
async function handleContextMenuAIEnhancement(request) {
  const { text, type } = request;
  
  // Create a fake event for positioning
  const fakeEvent = {
    clientX: window.innerWidth / 2,
    clientY: window.innerHeight / 2
  };
  
  currentSelection = text;
  showTooltip(fakeEvent, text);
  
  // Auto-detect language
  const isArabic = /[\u0600-\u06FF]/.test(text);
  const sourceLang = isArabic ? 'ar' : 'en';
  const targetLang = isArabic ? 'en' : 'ar';
  
  if (translationTooltip) {
    translationTooltip.querySelector('#source-lang').value = sourceLang;
    translationTooltip.querySelector('#target-lang').value = targetLang;
  }
  
  // First translate, then enhance
  await translateText(text);
  
  // Wait a bit for translation to complete
  setTimeout(async () => {
    switch (type) {
      case 'enhance':
        await enhanceWithAI();
        break;
      case 'grammar':
        // Add grammar analysis here
        break;
      case 'pronunciation':
        // Add pronunciation help here
        break;
    }
  }, 1000);
}

// Handle keyboard shortcut for translation
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

// Toggle tooltip visibility
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

// Auto-inject on compatible pages
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeTextSelection);
} else {
  initializeTextSelection();
}