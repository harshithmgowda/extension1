/**
 * ChatNotes - Production Popup Controller
 * Manages active tab discovery, content extraction orchestration, error handling, and preview handoff.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const tabStatusBadge = document.getElementById('tabStatusBadge');
  const tabStatusText = document.getElementById('tabStatusText');
  const stateTitle = document.getElementById('stateTitle');
  const stateDesc = document.getElementById('stateDesc');
  const stateIcon = document.getElementById('stateIcon');
  const extractBtn = document.getElementById('extractBtn');
  const extractBtnText = document.getElementById('extractBtnText');
  const previewBtn = document.getElementById('previewBtn');

  let activeTab = null;

  /**
   * Validates if a URL is a ChatGPT page
   */
  function isChatGPTUrl(url) {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();
      return (
        host === 'chatgpt.com' ||
        host.endsWith('.chatgpt.com') ||
        host === 'chat.openai.com' ||
        host.endsWith('.chat.openai.com')
      );
    } catch {
      return false;
    }
  }

  /**
   * Set status error message
   */
  function showError(title, desc) {
    stateTitle.textContent = title;
    stateDesc.textContent = desc;
    tabStatusBadge.className = 'status-badge inactive';
    tabStatusText.textContent = 'Notice';
    stateIcon.innerHTML = `
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="8" x2="12" y2="12"></line>
      <line x1="12" y1="16" x2="12.01" y2="16"></line>
    `;
    stateIcon.style.color = '#fbbf24';
  }

  /**
   * Query active tab and update UI
   */
  async function checkTab() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      activeTab = tabs && tabs[0] ? tabs[0] : null;

      if (!activeTab || !isChatGPTUrl(activeTab.url)) {
        showError(
          'Open ChatGPT',
          'Please navigate to a conversation on chatgpt.com to extract notes.'
        );
        extractBtn.disabled = true;
        previewBtn.disabled = false; // Allow opening preview to see demo notes
        return;
      }

      // ChatGPT Detected
      tabStatusBadge.className = 'status-badge ready';
      tabStatusText.textContent = 'ChatGPT Active';
      const cleanTitle = activeTab.title ? activeTab.title.replace(/\s*[-|•]\s*ChatGPT\s*$/i, '') : 'Conversation';
      stateTitle.textContent = 'Conversation Ready';
      stateDesc.textContent = `"${cleanTitle}"`;
      stateIcon.innerHTML = `<polyline points="20 6 9 17 4 12"></polyline>`;
      stateIcon.style.color = '#34d399';

      extractBtn.disabled = false;
      previewBtn.disabled = false;
    } catch (err) {
      console.error('[ChatNotes] Tab query failed:', err);
      showError('Detection Error', 'Unable to inspect tab. Please reload the page.');
    }
  }

  /**
   * Ensures extractor script is loaded before sending extraction message
   */
  async function ensureExtractorInjected(tabId) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content/chatgpt-extractor.js']
      });
    } catch (e) {
      // Content script may already be loaded via manifest; safe to ignore
      console.log('[ChatNotes] Script injection fallback:', e.message);
    }
  }

  // Handle Extraction Trigger
  extractBtn.addEventListener('click', async () => {
    if (!activeTab || !activeTab.id) return;

    extractBtn.disabled = true;
    extractBtnText.textContent = 'Extracting...';

    try {
      await ensureExtractorInjected(activeTab.id);

      // Send extraction request to content script
      chrome.tabs.sendMessage(activeTab.id, { action: 'EXTRACT_CONVERSATION' }, async (response) => {
        if (chrome.runtime.lastError || !response) {
          console.warn('[ChatNotes] Message error:', chrome.runtime.lastError);
          showError(
            'Extraction Notice',
            'ChatGPT structure may have updated or the conversation is still loading. Reopen preview to check cached notes.'
          );
          extractBtn.disabled = false;
          extractBtnText.textContent = 'Extract Conversation';
          return;
        }

        if (!response.success || !response.data) {
          showError(
            'No Messages Found',
            response.error || 'No conversation messages were detected on this page.'
          );
          extractBtn.disabled = false;
          extractBtnText.textContent = 'Extract Conversation';
          return;
        }

        // Save extracted conversation document to storage
        await chrome.storage.local.set({ active_document: response.data });

        extractBtnText.textContent = 'Extracted!';
        stateTitle.textContent = 'Ready for Export';
        stateDesc.textContent = `Captured ${response.data.messages ? response.data.messages.length : 0} messages. Opening Studio...`;

        // Automatically open the full preview studio tab
        setTimeout(() => {
          chrome.tabs.create({ url: chrome.runtime.getURL('preview/preview.html') });
          window.close();
        }, 400);
      });
    } catch (err) {
      console.error('[ChatNotes] Extraction trigger error:', err);
      showError('Extraction Error', 'Unable to communicate with ChatGPT page.');
      extractBtn.disabled = false;
      extractBtnText.textContent = 'Extract Conversation';
    }
  });

  // Handle Preview Open Trigger
  previewBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('preview/preview.html') });
    window.close();
  });

  // Run initial check
  checkTab();
});
