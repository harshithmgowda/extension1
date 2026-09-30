/**
 * ChatNotes - Studio & Preview Controller
 * Manages live rendering, customizer events, settings persistence, Xcode code blocks, and export dispatch.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements
  const paperSheet = document.getElementById('paperSheet');
  const documentContent = document.getElementById('documentContent');
  const templateStyleLink = document.getElementById('templateStyleLink');
  const docTitleDisplay = document.getElementById('docTitleDisplay');
  const docMetaDisplay = document.getElementById('docMetaDisplay');

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
  const printDocBtn = document.getElementById('printDocBtn');
  const exportDocxBtn = document.getElementById('exportDocxBtn');
  const exportMdBtn = document.getElementById('exportMdBtn');
  const exportHtmlBtn = document.getElementById('exportHtmlBtn');

  // Built-in Demo Document for instant testing with multiple languages & formats
  const DEMO_DOCUMENT = {
    title: 'Understanding Binary Search & Divide-and-Conquer Algorithms',
    createdAt: new Date().toISOString(),
    stats: {
      totalTurns: 2,
      totalWords: 420,
      codeBlockCount: 2,
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
            text: 'Can you explain Binary Search, calculate its time and space complexity, and provide clean implementations in Python and JavaScript?'
          }
        ]
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: [
          {
            type: 'paragraph',
            text: 'Binary Search is an optimal divide-and-conquer search algorithm designed for sorted collections. In each iteration, it halves the search interval by comparing the target value to the middle element.'
          },
          {
            type: 'list',
            ordered: false,
            items: [
              { text: 'Requires input collection to be sorted in ascending order.' },
              { text: 'Eliminates exactly 50% of candidate items in each comparison.' },
              { text: 'Guarantees logarithmic time complexity: O(log n).' },
              { text: 'Space-optimal: O(1) auxiliary memory for the iterative implementation.' }
            ]
          },
          {
            type: 'heading',
            level: 2,
            text: 'Complexity Analysis'
          },
          {
            type: 'table',
            headers: ['Metric', 'Best Case', 'Average Case', 'Worst Case'],
            rows: [
              ['Time Complexity', 'O(1)', 'O(log n)', 'O(log n)'],
              ['Space (Iterative)', 'O(1)', 'O(1)', 'O(1)'],
              ['Space (Recursive)', 'O(log n)', 'O(log n)', 'O(log n)'],
              ['Max Comparisons (N=1,000,000)', '1', '19', '20']
            ]
          },
          {
            type: 'heading',
            level: 2,
            text: 'Python Implementation (Xcode Style)'
          },
          {
            type: 'code',
            language: 'python',
            code: `def binary_search(arr: list[int], target: int) -> int:
    """Finds target in sorted array using binary search. Returns index or -1."""
    left: int = 0
    right: int = len(arr) - 1
    
    while left <= right:
        # Avoid integer overflow for large indices
        mid: int = left + (right - left) // 2
        
        if arr[mid] == target:
            return mid  # Element discovered
        elif arr[mid] < target:
            left = mid + 1  # Discard left half
        else:
            right = mid - 1  # Discard right half
            
    return -1  # Target not found in array`
          },
          {
            type: 'heading',
            level: 2,
            text: 'JavaScript Implementation'
          },
          {
            type: 'code',
            language: 'javascript',
            code: `/**
 * Performs iterative binary search on a sorted numeric array.
 * @param {number[]} nums Sorted array of numbers
 * @param {number} target Value to find
 * @returns {number} Index of target or -1
 */
function binarySearch(nums, target) {
  let left = 0;
  let right = nums.length - 1;

  while (left <= right) {
    const mid = left + Math.floor((right - left) / 2);

    if (nums[mid] === target) {
      return mid;
    } else if (nums[mid] < target) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return -1;
}`
          },
          {
            type: 'quote',
            text: 'Key Takeaway: Always compute mid using left + (right - left) // 2 rather than (left + right) // 2 to protect against 32-bit signed integer overflow in strict memory systems.'
          }
        ]
      }
    ]
  };

  // State
  let currentDoc = null;
  let currentSettings = {};

  /**
   * Display floating toast notification
   */
  function showToast(message) {
    const toast = document.getElementById('chatnotesToast');
    if (!toast) return;
    toast.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 15px; height: 15px; color: #34d399; flex-shrink: 0;">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
      <span>${escapeHtml(message)}</span>
    `;
    toast.classList.add('show');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 2500);
  }

  /**
   * Initialize state from storage
   */
  async function init() {
    currentSettings = await StorageManager.getSettings();
    const storedDoc = await StorageManager.getActiveDocument();
    currentDoc = storedDoc ? DocumentParser.normalize(storedDoc) : JSON.parse(JSON.stringify(DEMO_DOCUMENT));

    syncUIFromSettings();
    applyTypography();
    renderDocument();
    initWindowControls();
  }

  /**
   * Sync UI inputs to match currentSettings
   */
  function syncUIFromSettings() {
    // Mode
    modeButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === (currentSettings.exportMode || 'study'));
    });

    // Template
    const activeTemplate = currentSettings.template || 'academic';
    templateCards.forEach(card => {
      card.classList.toggle('active', card.dataset.template === activeTemplate);
    });
    updateTemplateCssLink(activeTemplate);

    // Typography
    if (fontFamilySelect) fontFamilySelect.value = currentSettings.font || 'Inter';
    if (fontSizeInput) {
      fontSizeInput.value = currentSettings.fontSize || 14;
      fontSizeVal.textContent = `${currentSettings.fontSize || 14} pt`;
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
    if (customColorPicker) customColorPicker.value = currentSettings.accentColor || '#0071e3';

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
   * Applies font family and typography tokens across the preview
   */
  function applyTypography() {
    const font = currentSettings.font || 'Inter';
    const size = currentSettings.fontSize || 14;
    const isSerif = font === 'Georgia' || font === 'Merriweather' || font === 'Playfair Display' || font === 'Times New Roman';
    const isMono = font === 'JetBrains Mono' || font === 'Fira Code';
    const fallback = isSerif ? 'serif' : isMono ? 'monospace' : 'sans-serif';
    const fullFont = `'${font}', ${fallback}`;

    document.documentElement.style.setProperty('--doc-font', fullFont);
    document.documentElement.style.setProperty('--doc-accent', currentSettings.accentColor || '#0071e3');

    if (paperSheet) {
      paperSheet.style.setProperty('--doc-font', fullFont);
      paperSheet.style.fontFamily = fullFont;
      paperSheet.style.fontSize = `${size}px`;
    }

    if (documentContent) {
      documentContent.style.setProperty('--doc-font', fullFont);
      documentContent.style.fontFamily = fullFont;
      documentContent.style.fontSize = `${size}px`;
      documentContent.style.setProperty('--doc-accent', currentSettings.accentColor || '#0071e3');
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
    applyTypography();
  }

  /**
   * Renders the formatted document into DOM
   */
  function renderDocument() {
    if (!currentDoc) return;

    docTitleDisplay.textContent = currentDoc.title || 'Untitled Notes';
    if (currentDoc.stats) {
      docMetaDisplay.innerHTML = `~${currentDoc.stats.totalWords || 0} words &bull; ${currentDoc.stats.totalTurns || 0} turns`;
    }

    // Deterministic formatting
    const formatted = DocumentFormatter.format(currentDoc, currentSettings.exportMode || 'study');

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

    applyTypography();
    wireXcodeCopyButtons();
  }

  /**
   * Renders array of content blocks into HTML with Xcode Code Blocks
   */
  function renderBlocksHtml(blocks) {
    if (!Array.isArray(blocks)) return '';

    const isDark = currentSettings.template === 'dark' || currentSettings.template === 'cyberpunk';

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
          // Render authentic Apple Xcode Playground window
          if (typeof XcodeHighlighter !== 'undefined') {
            return XcodeHighlighter.renderXcodeBlock(c.code, c.language || 'code', isDark);
          }
          return `
            <div class="xcode-window${isDark ? ' xcode-dark' : ''}">
              <div class="xcode-header">
                <div class="xcode-controls">
                  <span class="xcode-dot close"></span>
                  <span class="xcode-dot minimize"></span>
                  <span class="xcode-dot zoom"></span>
                </div>
                <div class="xcode-title">
                  <span class="xcode-lang-badge">${escapeHtml((c.language || 'code').toUpperCase())}</span>
                </div>
              </div>
              <pre class="xcode-code"><code class="language-${escapeHtml(c.language)}">${escapeHtml(c.code)}</code></pre>
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

  /**
   * Attach click handlers to all Xcode Copy buttons
   */
  function wireXcodeCopyButtons() {
    document.querySelectorAll('.xcode-copy-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const rawCode = decodeURIComponent(btn.getAttribute('data-code') || '');
        if (!rawCode) return;

        navigator.clipboard.writeText(rawCode).then(() => {
          btn.classList.add('copied');
          const textSpan = btn.querySelector('.copy-text');
          if (textSpan) textSpan.textContent = 'Copied!';
          showToast('Code copied to clipboard');
          setTimeout(() => {
            btn.classList.remove('copied');
            if (textSpan) textSpan.textContent = 'Copy';
          }, 2000);
        }).catch(err => {
          console.warn('[ChatNotes] Clipboard write error:', err);
        });
      });
    });
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
      const res = await fetch(`../templates/${currentSettings.template || 'academic'}.css`);
      return await res.text();
    } catch {
      return '';
    }
  }

  /**
   * Window Controls (macOS Traffic Light dots)
   */
  function initWindowControls() {
    const closeDot = document.querySelector('.win-dot.close');
    const minDot = document.querySelector('.win-dot.minimize');
    const maxDot = document.querySelector('.win-dot.maximize');
    const sidebar = document.querySelector('.sidebar-inspector');

    if (closeDot) {
      closeDot.addEventListener('click', () => {
        if (window.history.length > 1) {
          window.history.back();
        } else {
          window.close();
        }
      });
    }

    if (minDot && sidebar) {
      minDot.addEventListener('click', () => {
        sidebar.style.display = sidebar.style.display === 'none' ? 'flex' : 'none';
        showToast(sidebar.style.display === 'none' ? 'Inspector hidden' : 'Inspector shown');
      });
    }

    if (maxDot) {
      maxDot.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      });
    }
  }

  // =========================================================================
  // EVENT LISTENERS: CUSTOMIZATION CONTROLS
  // =========================================================================

  // Export Mode Switch
  modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      modeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentSettings.exportMode = btn.dataset.mode;
      StorageManager.saveSettings(currentSettings);
      renderDocument();
      showToast(`Mode: ${btn.dataset.mode.toUpperCase()}`);
    });
  });

  // Template Switch (12 Themes)
  templateCards.forEach(card => {
    card.addEventListener('click', () => {
      templateCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      currentSettings.template = card.dataset.template;
      updateTemplateCssLink(currentSettings.template);
      StorageManager.saveSettings(currentSettings);
      renderDocument();
      showToast(`Theme: ${card.dataset.template.toUpperCase()}`);
    });
  });

  // Typography & Font Family
  fontFamilySelect.addEventListener('change', (e) => {
    currentSettings.font = e.target.value;
    applyTypography();
    StorageManager.saveSettings(currentSettings);
    renderDocument();
    showToast(`Font: ${currentSettings.font}`);
  });

  fontSizeInput.addEventListener('input', (e) => {
    currentSettings.fontSize = parseInt(e.target.value, 10);
    fontSizeVal.textContent = `${currentSettings.fontSize} pt`;
    applyTypography();
    StorageManager.saveSettings(currentSettings);
  });

  // Page Setup & Borders
  pageSizeSelect.addEventListener('change', (e) => {
    currentSettings.pageSize = e.target.value;
    applySheetContainerClasses();
    StorageManager.saveSettings(currentSettings);
    showToast(`Paper: ${e.target.value}`);
  });

  orientationSelect.addEventListener('change', (e) => {
    currentSettings.orientation = e.target.value;
    applySheetContainerClasses();
    StorageManager.saveSettings(currentSettings);
    showToast(`Orientation: ${e.target.value}`);
  });

  marginsSelect.addEventListener('change', (e) => {
    currentSettings.margins = e.target.value;
    StorageManager.saveSettings(currentSettings);
    showToast(`Margins: ${e.target.value}`);
  });

  borderStyleSelect.addEventListener('change', (e) => {
    currentSettings.borderStyle = e.target.value;
    applySheetContainerClasses();
    StorageManager.saveSettings(currentSettings);
    showToast(`Border: ${e.target.value}`);
  });

  headerStyleSelect.addEventListener('change', (e) => {
    currentSettings.headerStyle = e.target.value;
    StorageManager.saveSettings(currentSettings);
  });

  footerStyleSelect.addEventListener('change', (e) => {
    currentSettings.footerStyle = e.target.value;
    StorageManager.saveSettings(currentSettings);
  });

  // Color Accents
  colorSwatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
      colorSwatches.forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      currentSettings.accentColor = swatch.dataset.color;
      applyTypography();
      StorageManager.saveSettings(currentSettings);
      showToast(`Accent tint applied`);
    });
  });

  customColorPicker.addEventListener('input', (e) => {
    currentSettings.accentColor = e.target.value;
    applyTypography();
    StorageManager.saveSettings(currentSettings);
  });

  // =========================================================================
  // EXPORT HANDLERS (Markdown, HTML, DOCX, PDF)
  // =========================================================================

  // 1. Download exact PDF (.pdf file directly downloaded to computer)
  exportPdfBtn.addEventListener('click', () => {
    const safeTitle = (currentDoc.title || 'notes').replace(/[^a-z0-9_-]/gi, '_');
    const filename = `${safeTitle}.pdf`;
    showToast(`Generating ${filename}...`);
    PdfExporter.download(currentDoc, currentSettings.exportMode || 'study', filename, currentSettings);
    showToast(`Downloaded ${filename}`);
  });

  // 2. System Print (Direct browser Print to PDF or printer)
  if (printDocBtn) {
    printDocBtn.addEventListener('click', () => {
      showToast('Opening print dialog...');
      PdfExporter.print(currentDoc, currentSettings);
    });
  }

  // 2. Export DOCX
  exportDocxBtn.addEventListener('click', () => {
    const safeTitle = (currentDoc.title || 'notes').replace(/[^a-z0-9_-]/gi, '_');
    const filename = `${safeTitle}.docx`;
    DocxExporter.download(currentDoc, currentSettings.exportMode || 'study', filename, currentSettings);
    showToast(`Downloaded ${filename}`);
  });

  // 3. Export Markdown
  exportMdBtn.addEventListener('click', () => {
    const mdText = MarkdownExporter.generate(currentDoc, currentSettings.exportMode || 'study');
    const safeTitle = (currentDoc.title || 'notes').replace(/[^a-z0-9_-]/gi, '_');
    const filename = `${safeTitle}.md`;
    MarkdownExporter.download(mdText, filename);
    showToast(`Downloaded ${filename}`);
  });

  // 4. Export HTML
  exportHtmlBtn.addEventListener('click', async () => {
    const templateCss = await fetchActiveTemplateCss();
    const htmlString = HtmlExporter.generate(currentDoc, documentContent.innerHTML, templateCss, currentSettings);
    const safeTitle = (currentDoc.title || 'notes').replace(/[^a-z0-9_-]/gi, '_');
    const filename = `${safeTitle}.html`;
    HtmlExporter.download(htmlString, filename);
    showToast(`Downloaded ${filename}`);
  });

  // Guarantee scroll is 0 before printing to eliminate blank first page gap
  window.addEventListener('beforeprint', () => {
    const canvasScroll = document.querySelector('.canvas-scroll');
    if (canvasScroll) {
      window._savedScrollTop = canvasScroll.scrollTop;
      canvasScroll.scrollTop = 0;
    }
  });

  window.addEventListener('afterprint', () => {
    const canvasScroll = document.querySelector('.canvas-scroll');
    if (canvasScroll && typeof window._savedScrollTop === 'number') {
      canvasScroll.scrollTop = window._savedScrollTop;
    }
  });

  // Boot
  init();
});
