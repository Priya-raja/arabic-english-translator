// background.js - Service worker for Chrome extension
/* global chrome */
/**
 * @global
 * @typedef {typeof chrome} chrome
 */

// Create context menu when extension installs
chrome.runtime.onInstalled.addListener(() => {
  createContextMenus();
  initializeExtension();
});

// Create context menus for right-click translation
function createContextMenus() {
  // Remove existing menus first
  chrome.contextMenus.removeAll(() => {
    // Main translate menu
    chrome.contextMenus.create({
      id: 'translate-selection',
      title: 'Translate "%s"',
      contexts: ['selection'],
      documentUrlPatterns: ['http://*/*', 'https://*/*']
    });

    // Sub-menus for specific language pairs
    chrome.contextMenus.create({
      id: 'translate-ar-to-en',
      parentId: 'translate-selection',
      title: 'Arabic → English',
      contexts: ['selection']
    });

    chrome.contextMenus.create({
      id: 'translate-en-to-ar',
      parentId: 'translate-selection',
      title: 'English → Arabic',
      contexts: ['selection']
    });

    chrome.contextMenus.create({
      id: 'translate-auto',
      parentId: 'translate-selection',
      title: 'Auto-detect → Auto-translate',
      contexts: ['selection']
    });

    // Separator
    chrome.contextMenus.create({
      id: 'separator-1',
      parentId: 'translate-selection',
      type: 'separator',
      contexts: ['selection']
    });

    // AI Enhancement options
    chrome.contextMenus.create({
      id: 'ai-enhance',
      parentId: 'translate-selection',
      title: '✨ AI Enhance Translation',
      contexts: ['selection']
    });

    chrome.contextMenus.create({
      id: 'explain-grammar',
      parentId: 'translate-selection',
      title: '📚 Explain Grammar',
      contexts: ['selection']
    });

    chrome.contextMenus.create({
      id: 'pronunciation-help',
      parentId: 'translate-selection',
      title: '📢 Pronunciation Help',
      contexts: ['selection']
    });
  });
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  const selectedText = info.selectionText;
  if (!selectedText) return;

  switch (info.menuItemId) {
    case 'translate-ar-to-en':
      translateInContentScript(tab.id, selectedText, 'ar', 'en');
      break;
    
    case 'translate-en-to-ar':
      translateInContentScript(tab.id, selectedText, 'en', 'ar');
      break;
    
    case 'translate-auto':
      translateInContentScript(tab.id, selectedText, 'auto', 'auto');
      break;
    
    case 'ai-enhance':
      enhanceWithAI(tab.id, selectedText, 'enhance');
      break;
    
    case 'explain-grammar':
      enhanceWithAI(tab.id, selectedText, 'grammar');
      break;
    
    case 'pronunciation-help':
      enhanceWithAI(tab.id, selectedText, 'pronunciation');
      break;
    
    default:
      // Default translate action
      translateInContentScript(tab.id, selectedText, 'auto', 'auto');
      break;
  }
});

// Send translation request to content script
async function translateInContentScript(tabId, text, sourceLang, targetLang) {
  try {
    // Auto-detect language if needed
    if (sourceLang === 'auto' || targetLang === 'auto') {
      const isArabic = /[\u0600-\u06FF]/.test(text);
      sourceLang = isArabic ? 'ar' : 'en';
      targetLang = isArabic ? 'en' : 'ar';
    }

    await chrome.tabs.sendMessage(tabId, {
      action: 'translate',
      text: text,
      sourceLang: sourceLang,
      targetLang: targetLang
    });
  } catch (error) {
    console.error('Failed to send translation message:', error);
    
    // Fallback: inject content script if not already present
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
      });
      
      // Also inject CSS
      await chrome.scripting.insertCSS({
        target: { tabId: tabId },
        files: ['content.css']
      });
      
      // Retry after injection
      setTimeout(() => {
        chrome.tabs.sendMessage(tabId, {
          action: 'translate',
          text: text,
          sourceLang: sourceLang,
          targetLang: targetLang
        });
      }, 1000);
    } catch (injectError) {
      console.error('Failed to inject content script:', injectError);
    }
  }
}

// Send AI enhancement request to content script
async function enhanceWithAI(tabId, text, type) {
  try {
    await chrome.tabs.sendMessage(tabId, {
      action: 'ai-enhance',
      text: text,
      type: type
    });
  } catch (error) {
    console.error('Failed to send AI enhancement message:', error);
  }
}

// Initialize extension settings
async function initializeExtension() {
  try {
    // Check if API key exists
    const result = await chrome.storage.local.get(['geminiApiKey', 'extensionSettings']);
    
    // Set default settings if not exists
    if (!result.extensionSettings) {
      const defaultSettings = {
        autoDetectLanguage: true,
        showTooltipOnSelection: true,
        enableContextMenu: true,
        enableKeyboardShortcuts: true,
        tooltipPosition: 'smart', // 'smart', 'top', 'bottom'
        translationEngine: 'auto', // 'google', 'lingva', 'mymemory', 'auto'
        aiEnhancementEnabled: true
      };
      
      await chrome.storage.local.set({ extensionSettings: defaultSettings });
    }

    // Initialize API key if provided
    if (result.geminiApiKey) {
      console.log('Gemini API key found in storage');
    }
  } catch (error) {
    console.error('Failed to initialize extension:', error);
  }
}

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // Open the popup/options page or perform default action
  chrome.action.setPopup({ popup: 'popup.html' });
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener(async (command, tab) => {
  switch (command) {
    case 'translate-selection':
      // Get selected text and translate
      try {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'translate-selection-shortcut'
        });
      } catch (error) {
        console.error('Failed to handle keyboard shortcut:', error);
      }
      break;
    
    case 'toggle-tooltip':
      // Toggle tooltip visibility
      try {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'toggle-tooltip'
        });
      } catch (error) {
        console.error('Failed to toggle tooltip:', error);
      }
      break;
  }
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'get-settings':
      chrome.storage.local.get(['extensionSettings', 'geminiApiKey']).then(result => {
        sendResponse({
          settings: result.extensionSettings,
          hasApiKey: !!result.geminiApiKey
        });
      });
      return true; // Keep message channel open for async response

    case 'save-settings':
      chrome.storage.local.set({ extensionSettings: request.settings }).then(() => {
        sendResponse({ success: true });
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
      return true;

    case 'save-api-key':
      chrome.storage.local.set({ geminiApiKey: request.apiKey }).then(() => {
        sendResponse({ success: true });
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
      return true;

    case 'get-translation-history':
      chrome.storage.local.get(['translationHistory']).then(result => {
        sendResponse({ history: result.translationHistory || [] });
      });
      return true;

    case 'clear-history':
      chrome.storage.local.set({ translationHistory: [] }).then(() => {
        sendResponse({ success: true });
      });
      return true;

    case 'save-translation':
      chrome.storage.local.get(['translationHistory']).then(result => {
        const history = result.translationHistory || [];
        const newHistory = [request.translation, ...history].slice(0, 100); // Keep last 100
        return chrome.storage.local.set({ translationHistory: newHistory });
      }).then(() => {
        sendResponse({ success: true });
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
      return true;

    case 'open-options':
      chrome.runtime.openOptionsPage();
      sendResponse({ success: true });
      return false;

    default:
      sendResponse({ error: 'Unknown action' });
      return false;
  }
});

// Handle extension updates
chrome.runtime.onUpdateAvailable.addListener((details) => {
  console.log('Extension update available:', details.version);
  // Auto-reload if no important state to preserve
  chrome.runtime.reload();
});

// Handle tab updates to inject content script when needed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && 
      (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
    
    // Check if content script injection is needed
    chrome.storage.local.get(['extensionSettings']).then(result => {
      const settings = result.extensionSettings;
      if (settings && settings.autoInjectContentScript !== false) {
        // Inject content script silently
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['content.js']
        }).catch(() => {
          // Ignore injection errors (might already be injected)
        });
      }
    });
  }
});

// Clean up old data periodically
setInterval(async () => {
  try {
    const result = await chrome.storage.local.get(['translationHistory']);
    const history = result.translationHistory || [];
    
    // Keep only translations from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const filteredHistory = history.filter(item => {
      const itemDate = new Date(item.timestamp);
      return itemDate > thirtyDaysAgo;
    });
    
    if (filteredHistory.length !== history.length) {
      await chrome.storage.local.set({ translationHistory: filteredHistory });
      console.log(`Cleaned up ${history.length - filteredHistory.length} old translations`);
    }
  } catch (error) {
    console.error('Failed to clean up old data:', error);
  }
}, 24 * 60 * 60 * 1000); // Run daily