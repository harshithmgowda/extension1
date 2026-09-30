/**
 * ChatNotes - Studio & Preview Controller
 * Manages live rendering, customizer events, settings persistence, and export dispatch.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements
  const paperSheet = document.getElementById('paperSheet');
  const documentContent = document.getElementById('documentContent');
  const templateStyleLink = document.getElementById('templateStyleLink');
  const docTitleDisplay = document.getElementById('docTitleDisplay');
  const docMetaDisplay = document.getElementById('docMetaDisplay');
  const resetDemoBtn = document.getElementById('resetDemoBtn');

  // Control Elements
  const modeButtons = document.querySelectorAll('.seg-item, .seg-btn');
  const templateCards = document.querySelectorAll('.theme-pill, .tpl-card');
  const fontFamilySelect = document.getElementById('fontFamilySelect');
  const fontSizeInput = document.getElementById('fontSizeInput');
  const fontSizeVal = document.getElementById('fontSizeVal');
  const pageSizeSelect = document.getElementById('pageSizeSelect');
  const orientationSelect = document.getElementById('orientationSelect');
  const marginsSelect = document.getElementById('marginsSelect');
  const borderStyleSelect = document.getElementById('borderStyleSelect');
  const headerStyleSelect = document.getElementById('headerStyleSelect');
  const footerStyleSelect = document.getElementById('footerStyleSelect');
  const colorSwatches = document.querySelectorAll('.color-dot, .color-swatch');
  const customColorPicker = document.getElementById('customColorPicker');

  // Export Buttons
  const exportPdfBtn = document.getElementById('exportPdfBtn');
  const exportDocxBtn = document.getElementById('exportDocxBtn');
  const exportMdBtn = document.getElementById('exportMdBtn');
  const exportHtmlBtn = document.getElementById('exportHtmlBtn');

  // Built-in Demo Document for instant testing
  const DEMO_DOCUMENT = {
    title: 'Understanding Binary Search & Divide-and-Conquer',
    createdAt: new Date().toISOString(),
    stats: {
      totalTurns: 2,
      totalWords: 340,
      codeBlockCount: 1,
      tableCount: 1,
      estimatedReadTimeMinutes: 2
    },
    messages: [
      {
        id: 'msg-1',
        role: 'user',
        content: [
          {
            type: 'paragraph',
            text: 'Can you explain Binary Search, how its time complexity is calculated, and provide an implementation in Python?'
          }
        ]
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: [
          {
            type: 'paragraph',
            text: 'Binary Search is an efficient algorithm for finding an item from a sorted list of items. It works by repeatedly dividing in half the portion of the list that could contain the item until you have narrowed down the possible locations to just one.'
          },
          {
            type: 'list',
            ordered: false,
            items: [
              { text: 'Requires input data to be sorted in ascending order.' },
              { text: 'Eliminates half the search area in each step.' },
              { text: 'Achieves logarithmic time complexity: O(log n).' },
              { text: 'Optimal space complexity: O(1) for iterative approach.' }
            ]
          },
          {
            type: 'heading',
            level: 2,
            text: 'Algorithm Complexity'
          },
          {
            type: 'table',
            headers: ['Operation', 'Best Case', 'Average Case', 'Worst Case'],
            rows: [
              ['Search Time', 'O(1)', 'O(log n)', 'O(log n)'],
              ['Space (Iterative)', 'O(1)', 'O(1)', 'O(1)'],
              ['Space (Recursive)', 'O(log n)', 'O(log n)', 'O(log n)']
            ]
          },
          {
            type: 'heading',
            level: 2,
            text: 'Python Implementation'
          },
          {
            type: 'code',
            language: 'python',
            code: 'def binary_search(arr, target):\n    left, right = 0, len(arr) - 1\n    \n    while left <= right:\n        mid = left + (right - left) // 2\n        if arr[mid] == target:\n            return mid\n        elif arr[mid] < target:\n            left = mid + 1\n        else:\n            right = mid - 1\n            \n    return -1  # Target not found'
          },
          {
            type: 'quote',
            text: 'Always calculate mid using left + (right - left) // 2 to prevent integer overflow in languages with fixed integer ranges.'
          }
        ]
      }
    ]
  };

  // State
  let currentDoc = null;
  let currentSettings = {};

  /**
   * Initialize state from storage
   */
  async function init() {
    currentSettings = await StorageManager.getSettings();
    const storedDoc = await StorageManager.getActiveDocument();
    currentDoc = storedDoc ? DocumentParser.normalize(storedDoc) : DEMO_DOCUMENT;

    syncUIFromSettings();
    renderDocument();
  }

  /**
   * Sync UI inputs to match currentSettings
   */
  function syncUIFromSettings() {
    // Mode
    modeButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === currentSettings.exportMode);
    });

    // Template
    templateCards.forEach(card => {
      card.classList.toggle('active', card.dataset.template === currentSettings.template);
    });
    updateTemplateCssLink(currentSettings.template);

    // Typography
    if (fontFamilySelect) fontFamilySelect.value = currentSettings.font || 'Inter';
    if (fontSizeInput) {
      fontSizeInput.value = currentSettings.fontSize || 14;
      fontSizeVal.textContent = `${currentSettings.fontSize || 14}px`;
    }

    // Page & Borders
    if (pageSizeSelect) pageSizeSelect.value = currentSettings.pageSize || 'A4';
    if (orientationSelect) orientationSelect.value = currentSettings.orientation || 'portrait';
    if (marginsSelect) marginsSelect.value = currentSettings.margins || 'normal';
    if (borderStyleSelect) borderStyleSelect.value = currentSettings.borderStyle || 'simple';

    // Headers & Footers
    if (headerStyleSelect) headerStyleSelect.value = currentSettings.headerStyle || 'title';
    if (footerStyleSelect) footerStyleSelect.value = currentSettings.footerStyle || 'page-numbers';

    // Color Swatches
    colorSwatches.forEach(swatch => {
      swatch.classList.toggle('active', swatch.dataset.color === currentSettings.accentColor);
    });
    if (customColorPicker) customColorPicker.value = currentSettings.accentColor || '#4f46e5';

    applySheetContainerClasses();
  }

  /**
   * Dynamically loads template CSS into preview document
   */
  function updateTemplateCssLink(templateName) {
    if (templateStyleLink) {
      templateStyleLink.href = `../templates/${templateName}.css`;
    }
  }

  /**
   * Applies page size, orientation, and borders to the preview paper sheet
   */
  function applySheetContainerClasses() {
    const pSize = currentSettings.pageSize ? currentSettings.pageSize.toLowerCase() : 'a4';
    const orient = currentSettings.orientation || 'portrait';
    const border = currentSettings.borderStyle || 'simple';

    paperSheet.className = `paper-sheet size-${pSize} orientation-${orient} border-${border}`;
    paperSheet.style.fontFamily = `'${currentSettings.font || 'Inter'}', sans-serif`;
    paperSheet.style.fontSize = `${currentSettings.fontSize || 14}px`;
  }

  /**
   * Renders the formatted document into DOM
   */
  function renderDocument() {
    if (!currentDoc) return;

    docTitleDisplay.textContent = currentDoc.title || 'Untitled Notes';
    if (currentDoc.stats) {
      docMetaDisplay.textContent = `~${currentDoc.stats.totalWords || 0} words &bull; ${currentDoc.stats.totalTurns || 0} turns`;
    }

    // Deterministic formatting
    const formatted = DocumentFormatter.format(currentDoc, currentSettings.exportMode);

    // Build HTML representation (Apple minimalist document layout)
    let html = `
      <header class="doc-header">
        <h1 class="doc-title">${escapeHtml(formatted.title)}</h1>
        <div class="doc-meta">
          <span>${new Date(currentDoc.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
          <span class="meta-dot">&bull;</span>
          <span>${formatted.mode.toUpperCase()}</span>
          <span class="meta-dot">&bull;</span>
          <span>${currentDoc.stats ? currentDoc.stats.estimatedReadTimeMinutes : 1} min read</span>
        </div>
      </header>
    `;

    formatted.sections.forEach(sec => {
      if (sec.type === 'study-card') {
        html += `
          <section class="study-card">
            <div class="question-box">
              <span class="q-label">Prompt</span>
              <div class="q-text">${escapeHtml(sec.question)}</div>
            </div>
            <div class="answer-blocks">
              ${renderBlocksHtml(sec.blocks)}
            </div>
          </section>
        `;
      } else if (sec.type === 'user-turn' || sec.type === 'assistant-turn') {
        html += `
          <section class="${sec.type}">
            <div class="turn-badge ${sec.type === 'user-turn' ? 'user' : 'assistant'}">${sec.badge}</div>
            <div class="turn-content">
              ${renderBlocksHtml(sec.blocks)}
            </div>
          </section>
        `;
      } else {
        html += `
          <div class="compact-row">
            <span class="compact-badge">${sec.badge}</span>
            <div class="compact-body">${renderBlocksHtml(sec.blocks)}</div>
          </div>
        `;
      }
    });

    documentContent.className = `chatnotes-document template-${currentSettings.template || 'academic'}`;
    documentContent.innerHTML = html;
  }

  /**
   * Renders array of content blocks into HTML
   */
  function renderBlocksHtml(blocks) {
    if (!Array.isArray(blocks)) return '';

    return blocks.map(block => {
      switch (block.type) {
        case 'paragraph':
          return `<p>${escapeHtml(block.text)}</p>`;
        case 'heading':
          return `<h${block.level}>${escapeHtml(block.text)}</h${block.level}>`;
        case 'key-points':
          return `
            <div class="key-points-box">
              <div class="key-points-title">${escapeHtml(block.title)}</div>
              ${renderListHtml(block.list)}
            </div>
          `;
        case 'code-highlight':
        case 'code': {
          const c = block.codeBlock || block;
          return `
            <div class="code-wrapper">
              <div class="code-header-bar">
                <span class="code-lang-label">${escapeHtml((c.language || 'code').toUpperCase())}</span>
              </div>
              <pre><code class="language-${escapeHtml(c.language)}">${escapeHtml(c.code)}</code></pre>
            </div>
          `;
        }
        case 'table-highlight':
        case 'table': {
          const t = block.tableBlock || block;
          return renderTableHtml(t);
        }
        case 'list':
          return renderListHtml(block);
        case 'quote':
          return `<blockquote>${escapeHtml(block.text)}</blockquote>`;
        case 'math':
          return `<div class="math-block"><code>${escapeHtml(block.latex)}</code></div>`;
        default:
          return `<p>${escapeHtml(block.text || '')}</p>`;
      }
    }).join('\n');
  }

  function renderListHtml(listBlock) {
    const isOrdered = Boolean(listBlock.ordered);
    const tag = isOrdered ? 'ol' : 'ul';
    const items = Array.isArray(listBlock.items) ? listBlock.items : [];
    const lis = items.map(it => `<li>${escapeHtml(it.text)}${it.subitems && it.subitems.length ? renderListHtml({ ordered: isOrdered, items: it.subitems }) : ''}</li>`).join('');
    return `<${tag}>${lis}</${tag}>`;
  }

  function renderTableHtml(tableBlock) {
    const headers = Array.isArray(tableBlock.headers) ? tableBlock.headers : [];
    const rows = Array.isArray(tableBlock.rows) ? tableBlock.rows : [];
    let html = '<table>';
    if (headers.length > 0) {
      html += '<thead><tr>' + headers.map(h => `<th>${escapeHtml(h)}</th>`).join('') + '</tr></thead>';
    }
    if (rows.length > 0) {
      html += '<tbody>' + rows.map(r => '<tr>' + r.map(c => `<td>${escapeHtml(c)}</td>`).join('') + '</tr>').join('') + '</tbody>';
    }
    html += '</table>';
    return html;
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * Helper to retrieve active template CSS text for HTML / PDF export
   */
  async function fetchActiveTemplateCss() {
    try {
      const res = await fetch(`../templates/${currentSettings.template}.css`);
      return await res.text();
    } catch {
      return '';
    }
  }

  // Event Listeners: Export Mode Switch
  modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      modeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentSettings.exportMode = btn.dataset.mode;
      StorageManager.saveSettings(currentSettings);
      renderDocument();
    });
  });

  // Event Listeners: Template Switch
  templateCards.forEach(card => {
    card.addEventListener('click', () => {
      templateCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      currentSettings.template = card.dataset.template;
      updateTemplateCssLink(currentSettings.template);
      StorageManager.saveSettings(currentSettings);
      renderDocument();
    });
  });

  // Event Listeners: Typography & Font Family
  fontFamilySelect.addEventListener('change', (e) => {
    currentSettings.font = e.target.value;
    applySheetContainerClasses();
    StorageManager.saveSettings(currentSettings);
  });

  fontSizeInput.addEventListener('input', (e) => {
    currentSettings.fontSize = parseInt(e.target.value, 10);
    fontSizeVal.textContent = `${currentSettings.fontSize}px`;
    applySheetContainerClasses();
    StorageManager.saveSettings(currentSettings);
  });

  // Event Listeners: Page Setup & Borders
  pageSizeSelect.addEventListener('change', (e) => {
    currentSettings.pageSize = e.target.value;
    applySheetContainerClasses();
    StorageManager.saveSettings(currentSettings);
  });

  orientationSelect.addEventListener('change', (e) => {
    currentSettings.orientation = e.target.value;
    applySheetContainerClasses();
    StorageManager.saveSettings(currentSettings);
  });

  marginsSelect.addEventListener('change', (e) => {
    currentSettings.margins = e.target.value;
    StorageManager.saveSettings(currentSettings);
  });

  borderStyleSelect.addEventListener('change', (e) => {
    currentSettings.borderStyle = e.target.value;
    applySheetContainerClasses();
    StorageManager.saveSettings(currentSettings);
  });

  headerStyleSelect.addEventListener('change', (e) => {
    currentSettings.headerStyle = e.target.value;
    StorageManager.saveSettings(currentSettings);
  });

  footerStyleSelect.addEventListener('change', (e) => {
    currentSettings.footerStyle = e.target.value;
    StorageManager.saveSettings(currentSettings);
  });

  // Event Listeners: Color Accents
  colorSwatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
      colorSwatches.forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      currentSettings.accentColor = swatch.dataset.color;
      documentContent.style.setProperty('--doc-accent', currentSettings.accentColor);
      StorageManager.saveSettings(currentSettings);
    });
  });

  customColorPicker.addEventListener('input', (e) => {
    currentSettings.accentColor = e.target.value;
    documentContent.style.setProperty('--doc-accent', currentSettings.accentColor);
    StorageManager.saveSettings(currentSettings);
  });

  // Reset Demo Sample
  resetDemoBtn.addEventListener('click', () => {
    currentDoc = DEMO_DOCUMENT;
    renderDocument();
  });

  // =========================================================================
  // EXPORT HANDLERS
  // =========================================================================

  // 1. Export PDF
  exportPdfBtn.addEventListener('click', async () => {
    const templateCss = await fetchActiveTemplateCss();
    PdfExporter.export(currentDoc, documentContent.innerHTML, templateCss, currentSettings);
  });

  // 2. Export DOCX
  exportDocxBtn.addEventListener('click', () => {
    const filename = `${(currentDoc.title || 'notes').replace(/[^a-z0-9_-]/gi, '_')}.docx`;
    DocxExporter.download(currentDoc, currentSettings.exportMode, filename);
  });

  // 3. Export Markdown
  exportMdBtn.addEventListener('click', () => {
    const mdText = MarkdownExporter.generate(currentDoc, currentSettings.exportMode);
    const filename = `${(currentDoc.title || 'notes').replace(/[^a-z0-9_-]/gi, '_')}.md`;
    MarkdownExporter.download(mdText, filename);
  });

  // 4. Export HTML
  exportHtmlBtn.addEventListener('click', async () => {
    const templateCss = await fetchActiveTemplateCss();
    const htmlString = HtmlExporter.generate(currentDoc, documentContent.innerHTML, templateCss, currentSettings);
    const filename = `${(currentDoc.title || 'notes').replace(/[^a-z0-9_-]/gi, '_')}.html`;
    HtmlExporter.download(htmlString, filename);
  });

  // Boot
  init();
});
