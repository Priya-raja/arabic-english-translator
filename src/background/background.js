// Background service worker (MV3)
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ contentScriptEnabled: true })
})

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.action === 'ping') sendResponse({ ok: true })
})
