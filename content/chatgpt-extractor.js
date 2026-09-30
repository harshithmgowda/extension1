/**
 * ChatNotes - ChatGPT Content Extractor
 * Resilient, multi-strategy DOM extractor for ChatGPT conversations.
 * Preserves semantic hierarchy: Headings, Code, Tables, Lists, Quotes, Math.
 */

(function () {
  // Prevent duplicate injection
  if (window.__CHATNOTES_EXTRACTOR_LOADED__) return;
  window.__CHATNOTES_EXTRACTOR_LOADED__ = true;

  console.log('[ChatNotes] Extractor script initialized.');

  /**
   * Centralized Selector Configuration
   * Multiple fallback strategies for resilient extraction across ChatGPT UI versions.
   */
  const SELECTORS = {
    // Message Turns
    turnContainers: [
      'article[data-testid^="conversation-turn-"]',
      'div[data-message-author-role]',
      '.agent-turn, .user-turn',
      'main div[class*="react-scroll-to-bottom"] > div > div > div',
      'main .text-base'
    ],
    // Conversation Title
    titleElements: [
      'nav a[class*="bg-token-sidebar-surface-secondary"]',
      'nav li[data-active="true"]',
      'header h1',
      'title'
    ],
    // Role markers
    userRole: [
      '[data-message-author-role="user"]',
      '.user-turn',
      '[data-testid="user-message"]'
    ],
    assistantRole: [
      '[data-message-author-role="assistant"]',
      '.agent-turn',
      '.markdown'
    ]
  };

  /**
   * Extracts clean conversation title
   * @returns {string}
   */
  function extractConversationTitle() {
    // 1. Try document title
    if (document.title && !document.title.toLowerCase().startsWith('chatgpt')) {
      const clean = document.title.replace(/\s*[-|•]\s*ChatGPT\s*$/i, '').trim();
      if (clean) return clean;
    }

    // 2. Try sidebar active item
    for (const sel of SELECTORS.titleElements) {
      const el = document.querySelector(sel);
      if (el && el.textContent.trim()) {
        const title = el.textContent.replace(/\s*[-|•]\s*ChatGPT\s*$/i, '').trim();
        if (title && title.length < 120) return title;
      }
    }

    // 3. Fallback: First user question snippet
    const firstUserMsg = document.querySelector('[data-message-author-role="user"]');
    if (firstUserMsg && firstUserMsg.textContent.trim()) {
      const text = firstUserMsg.textContent.trim().split('\n')[0];
      return text.length > 50 ? text.substring(0, 47) + '...' : text;
    }

    return 'ChatGPT Conversation';
  }

  /**
   * Determine whether an element represents a user or assistant message
   * @param {HTMLElement} el
   * @returns {'user'|'assistant'|'system'}
   */
  function determineRole(el) {
    // Direct attribute checks
    if (el.getAttribute('data-message-author-role') === 'user') return 'user';
    if (el.getAttribute('data-message-author-role') === 'assistant') return 'assistant';

    // Sub-element checks
    if (el.querySelector('[data-message-author-role="user"]') || el.classList.contains('user-turn')) {
      return 'user';
    }
    if (el.querySelector('[data-message-author-role="assistant"]') || el.classList.contains('agent-turn')) {
      return 'assistant';
    }

    // Fallback heuristic: assistant typically contains .markdown
    if (el.querySelector('.markdown')) {
      return 'assistant';
    }

    return 'user';
  }

  /**
   * Parses table element into structured headers & rows
   * @param {HTMLTableElement} tableEl
   * @returns {object}
   */
  function parseTable(tableEl) {
    const headers = [];
    const rows = [];

    // Header cells
    const ths = tableEl.querySelectorAll('thead th, tr:first-child th');
    if (ths.length > 0) {
      ths.forEach(th => headers.push(th.textContent.trim()));
    }

    // Row cells
    const trs = tableEl.querySelectorAll('tbody tr, tr');
    trs.forEach((tr, index) => {
      // If first row was used as header, skip it
      if (index === 0 && ths.length > 0 && tr.querySelector('th')) return;
      
      const row = [];
      const cells = tr.querySelectorAll('td, th');
      if (cells.length > 0) {
        cells.forEach(td => row.push(td.textContent.trim()));
        rows.push(row);
      }
    });

    return {
      type: 'table',
      headers,
      rows
    };
  }

  /**
   * Parses code block (<pre><code>)
   * @param {HTMLElement} preEl
   * @returns {object}
   */
  function parseCodeBlock(preEl) {
    const codeEl = preEl.querySelector('code') || preEl;
    let language = 'text';

    // Language detection from class names (e.g. language-python)
    const codeClass = codeEl.className || '';
    const langMatch = codeClass.match(/language-([a-zA-Z0-9_-]+)/i);
    if (langMatch) {
      language = langMatch[1];
    } else {
      // Look for ChatGPT language header bar
      const langHeader = preEl.querySelector('.flex.items-center, div[class*="text-xs"]');
      if (langHeader && langHeader.textContent.trim()) {
        const potential = langHeader.textContent.trim().split(' ')[0].toLowerCase();
        if (potential && potential !== 'copy' && potential.length < 20) {
          language = potential;
        }
      }
    }

    // Extract pure code without "Copy code" button labels
    // Clone node to safely remove buttons without altering DOM
    const clone = codeEl.cloneNode(true);
    const buttons = clone.querySelectorAll('button, svg, [class*="copy"]');
    buttons.forEach(b => b.remove());

    const codeText = clone.textContent.replace(/\r\n/g, '\n');

    return {
      type: 'code',
      language: language.toLowerCase(),
      code: codeText
    };
  }

  /**
   * Parses list (ul / ol) recursively
   * @param {HTMLElement} listEl
   * @returns {object}
   */
  function parseList(listEl) {
    const ordered = listEl.tagName.toLowerCase() === 'ol';
    const items = [];

    const lis = listEl.querySelectorAll(':scope > li');
    lis.forEach(li => {
      const nestedList = li.querySelector('ul, ol');
      let text = '';
      
      // Collect direct text excluding nested list
      li.childNodes.forEach(child => {
        if (child.nodeType === Node.TEXT_NODE) {
          text += child.textContent;
        } else if (child !== nestedList) {
          text += child.textContent;
        }
      });

      const itemObj = {
        text: text.trim(),
        subitems: nestedList ? parseList(nestedList).items : []
      };
      items.push(itemObj);
    });

    return {
      type: 'list',
      ordered,
      items
    };
  }

  /**
   * Extracts mathematical formulas (LaTeX / KaTeX) if present
   * @param {HTMLElement} el
   * @returns {object|null}
   */
  function parseMath(el) {
    // KaTeX annotation
    const annotation = el.querySelector('annotation[encoding="application/x-tex"]');
    if (annotation && annotation.textContent.trim()) {
      return {
        type: 'math',
        latex: annotation.textContent.trim(),
        display: el.classList.contains('katex-display') || el.tagName.toLowerCase() === 'div'
      };
    }
    return null;
  }

  /**
   * Parses rich content elements inside a message body
   * @param {HTMLElement} contentContainer
   * @returns {Array<object>}
   */
  function parseMessageContent(contentContainer) {
    const blocks = [];
    const elements = contentContainer.children;

    if (!elements || elements.length === 0) {
      const text = contentContainer.textContent.trim();
      if (text) {
        blocks.push({ type: 'paragraph', text });
      }
      return blocks;
    }

    for (const el of elements) {
      const tag = el.tagName.toLowerCase();

      // 1. Math formulas
      const math = parseMath(el);
      if (math) {
        blocks.push(math);
        continue;
      }

      // 2. Headings (h1 - h6)
      if (/^h[1-6]$/.test(tag)) {
        blocks.push({
          type: 'heading',
          level: parseInt(tag.charAt(1), 10),
          text: el.textContent.trim()
        });
        continue;
      }

      // 3. Code blocks
      if (tag === 'pre') {
        blocks.push(parseCodeBlock(el));
        continue;
      }

      // 4. Tables
      if (tag === 'table' || el.querySelector('table')) {
        const table = el.tagName.toLowerCase() === 'table' ? el : el.querySelector('table');
        blocks.push(parseTable(table));
        continue;
      }

      // 5. Lists (unordered / ordered)
      if (tag === 'ul' || tag === 'ol') {
        blocks.push(parseList(el));
        continue;
      }

      // 6. Blockquotes
      if (tag === 'blockquote') {
        blocks.push({
          type: 'quote',
          text: el.textContent.trim()
        });
        continue;
      }

      // 7. Images
      if (tag === 'img' || el.querySelector('img')) {
        const img = tag === 'img' ? el : el.querySelector('img');
        if (img && img.src) {
          blocks.push({
            type: 'image',
            src: img.src,
            alt: img.alt || 'Conversation illustration'
          });
          continue;
        }
      }

      // 8. Default: Paragraph / Container
      // Check for nested pre/code
      if (el.querySelector('pre')) {
        const pre = el.querySelector('pre');
        blocks.push(parseCodeBlock(pre));
        continue;
      }

      const text = el.textContent.trim();
      if (text) {
        // Collect inline links if present
        const links = [];
        el.querySelectorAll('a').forEach(a => {
          if (a.href) links.push({ text: a.textContent.trim(), url: a.href });
        });

        blocks.push({
          type: 'paragraph',
          text,
          links: links.length > 0 ? links : undefined
        });
      }
    }

    return blocks;
  }

  /**
   * Main Extraction Engine
   * @returns {object} Structured Document Model
   */
  function extractConversation() {
    const title = extractConversationTitle();
    const messages = [];

    // Find message turn elements
    let turnElements = [];
    for (const selector of SELECTORS.turnContainers) {
      const found = document.querySelectorAll(selector);
      if (found && found.length > 0) {
        turnElements = Array.from(found);
        break;
      }
    }

    // If turnContainers failed, fallback to any markdown elements or broad blocks
    if (turnElements.length === 0) {
      const markdowns = document.querySelectorAll('.markdown');
      if (markdowns && markdowns.length > 0) {
        turnElements = Array.from(markdowns).map(m => m.closest('article') || m.parentElement);
      }
    }

    turnElements.forEach((turnEl, index) => {
      const role = determineRole(turnEl);
      
      // Locate content body container
      const contentContainer = turnEl.querySelector('.markdown') ||
                               turnEl.querySelector('.whitespace-pre-wrap') ||
                               turnEl;

      const contentBlocks = parseMessageContent(contentContainer);

      if (contentBlocks.length > 0) {
        messages.push({
          id: `msg-${index + 1}`,
          role,
          timestamp: new Date().toISOString(),
          content: contentBlocks
        });
      }
    });

    return {
      title: title || 'ChatGPT Conversation',
      url: window.location.href,
      extractedAt: new Date().toISOString(),
      messageCount: messages.length,
      messages
    };
  }

  // Runtime Message Listener
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'EXTRACT_CONVERSATION') {
      try {
        const conversationData = extractConversation();
        if (!conversationData.messages || conversationData.messages.length === 0) {
          sendResponse({
            success: false,
            error: 'No conversation messages detected on this page.'
          });
        } else {
          sendResponse({
            success: true,
            data: conversationData
          });
        }
      } catch (err) {
        console.error('[ChatNotes] Extraction failed:', err);
        sendResponse({
          success: false,
          error: 'Failed to extract conversation: ' + err.message
        });
      }
      return true; // Keep message channel open for async response
    }
  });

  // Expose on window for direct debugging
  window.__ChatNotesExtractor = {
    extract: extractConversation
  };
})();
