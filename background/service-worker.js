/**
 * ChatNotes - Background Service Worker (Manifest V3)
 * Handles tab management, storage orchestration, and content script injection.
 */

// Initialize default settings on install
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[ChatNotes] Installed:', details.reason);
  
  const defaults = {
    settings: {
      template: 'academic',
      font: 'Inter',
      fontSize: 14,
      accentColor: '#4f46e5',
      textColor: '#1e293b',
      bgColor: '#ffffff',
      headingColor: '#0f172a',
      borderStyle: 'simple',
      pageSize: 'A4',
      orientation: 'portrait',
      margins: 'normal',
      headerStyle: 'title',
      footerStyle: 'page-numbers',
      exportMode: 'study' // 'exact' | 'study' | 'compact'
    }
  };

  const existing = await chrome.storage.local.get('settings');
  if (!existing || !existing.settings) {
    await chrome.storage.local.set(defaults);
  }
});

// Message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Open Preview tab
  if (request.action === 'OPEN_PREVIEW') {
    const previewUrl = chrome.runtime.getURL('preview/preview.html');
    
    // Check if preview is already open
    chrome.tabs.query({ url: previewUrl }, (tabs) => {
      if (tabs && tabs.length > 0) {
        chrome.tabs.update(tabs[0].id, { active: true });
        chrome.windows.update(tabs[0].windowId, { focused: true });
      } else {
        chrome.tabs.create({ url: previewUrl });
      }
      sendResponse({ success: true });
    });
    return true;
  }
});
