/**
 * ChatNotes - Popup Controller (Phase 1)
 * Handles tab detection, UI state updates, and user interaction.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements
  const tabStatusBadge = document.getElementById('tabStatusBadge');
  const tabStatusText = document.getElementById('tabStatusText');
  const stateCard = document.getElementById('stateCard');
  const stateTitle = document.getElementById('stateTitle');
  const stateDesc = document.getElementById('stateDesc');
  const stateIcon = document.getElementById('stateIcon');
  const extractBtn = document.getElementById('extractBtn');
  const extractBtnText = document.getElementById('extractBtnText');
  const previewBtn = document.getElementById('previewBtn');

  /**
   * Check if a given URL is a valid ChatGPT domain
   * @param {string} url
   * @returns {boolean}
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
   * Update UI to reflect whether ChatGPT is active
   * @param {chrome.tabs.Tab|null} tab
   */
  function updateUIForTab(tab) {
    const isChatGPT = tab && isChatGPTUrl(tab.url);

    if (isChatGPT) {
      // Status Badge
      tabStatusBadge.className = 'status-badge ready';
      tabStatusText.textContent = 'ChatGPT Active';

      // State Card
      stateTitle.textContent = 'Conversation Ready';
      stateDesc.textContent = tab.title ? `"${tab.title.replace(' - ChatGPT', '')}"` : 'ChatGPT conversation detected. Ready to extract.';
      stateIcon.innerHTML = `
        <polyline points="20 6 9 17 4 12"></polyline>
      `;
      stateIcon.style.color = '#34d399';

      // Buttons
      extractBtn.disabled = false;
      previewBtn.disabled = false;
    } else {
      // Status Badge
      tabStatusBadge.className = 'status-badge inactive';
      tabStatusText.textContent = 'Not on ChatGPT';

      // State Card
      stateTitle.textContent = 'Open ChatGPT';
      stateDesc.textContent = 'Navigate to a conversation on chatgpt.com to extract notes.';
      stateIcon.innerHTML = `
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      `;
      stateIcon.style.color = '#fbbf24';

      // Buttons
      extractBtn.disabled = true;
      previewBtn.disabled = true;
    }
  }

  // Detect current active tab
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    updateUIForTab(activeTab);

    // Verify storage API works (Phase 1 diagnostic test)
    chrome.storage.local.set({ chatnotes_initialized: Date.now() });
  } catch (error) {
    console.error('[ChatNotes] Tab query failed:', error);
    tabStatusBadge.className = 'status-badge inactive';
    tabStatusText.textContent = 'Error';
    stateTitle.textContent = 'Detection Error';
    stateDesc.textContent = 'Unable to inspect current tab. Please reload the extension.';
  }

  // Extract button click handler (preparatory logic for Phase 2)
  extractBtn.addEventListener('click', async () => {
    extractBtn.disabled = true;
    extractBtnText.textContent = 'Extracting...';

    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!activeTab || !isChatGPTUrl(activeTab.url)) {
        throw new Error('Not on a valid ChatGPT page.');
      }

      // Visual confirmation for Phase 1
      setTimeout(() => {
        extractBtnText.textContent = 'Extracted (Phase 1 Ready)';
        stateTitle.textContent = 'Phase 1 Validated!';
        stateDesc.textContent = 'Extension is active and detecting tabs correctly. Ready for Phase 2 extractor.';
      }, 600);
    } catch (err) {
      console.error('[ChatNotes] Extraction trigger error:', err);
      extractBtnText.textContent = 'Extract Conversation';
      extractBtn.disabled = false;
    }
  });

  // Preview button click handler
  previewBtn.addEventListener('click', () => {
    console.log('[ChatNotes] Preview requested.');
  });
});
