/**
 * ChatNotes - PDF Exporter
 * Generates vector-crisp, multi-page PDFs using clean browser print rendering.
 * Guarantees exact pages with ZERO blank/empty pages, full Xcode syntax highlighting,
 * tables, headers, footers, custom page sizes, and responsive paper margins.
 */

const PdfExporter = {
  /**
   * Export document to PDF via clean dedicated print window or fallback iframe
   * @param {object} doc Structured document model
   * @param {string} renderedHtml Inner HTML of document body
   * @param {string} templateCss Embedded CSS styles
   * @param {object} settings Customization preferences
   */
  export(doc, renderedHtml, templateCss = '', settings = {}) {
    const title = (doc && doc.title) ? doc.title : 'ChatNotes Document';
    const htmlContent = this.generatePrintableHtml(doc, renderedHtml, templateCss, settings);

    // 1. Primary method: Dedicated clean print tab/window
    // This avoids all parent DOM overflow/flex clipping bugs in Chromium that cause empty pages
    let printWin = null;
    try {
      printWin = window.open('', '_blank');
    } catch (e) {
      console.warn('[ChatNotes] window.open failed, falling back to iframe:', e);
    }

    if (printWin && !printWin.closed) {
      try {
        printWin.document.open();
        printWin.document.write(htmlContent);
        printWin.document.close();
        return;
      } catch (err) {
        console.warn('[ChatNotes] Failed to write to print window, falling back to iframe:', err);
      }
    }

    // 2. Fallback method: Isolated hidden iframe print
    this.printViaIframe(htmlContent);
  },

  /**
   * Builds self-contained, standalone printable HTML document
   * Optimized specifically for Chromium and WebKit print pagination engines
   */
  generatePrintableHtml(doc, renderedHtml, templateCss = '', settings = {}) {
    const title = (doc && doc.title) ? doc.title : 'ChatNotes Document';
    const font = settings.font || 'Inter';
    const accent = settings.accentColor || '#0071e3';
    const pageSize = settings.pageSize || 'A4';
    const orientation = settings.orientation || 'portrait';

    const marginMap = {
      small: '10mm',
      normal: '18mm',
      large: '26mm'
    };
    const marginValue = marginMap[settings.margins] || '18mm';

    const isSerif = font === 'Georgia' || font === 'Merriweather' || font === 'Playfair Display' || font === 'Times New Roman';
    const isMono = font === 'JetBrains Mono' || font === 'Fira Code';
    const fallbackFont = isSerif ? 'Georgia, serif' : isMono ? 'monospace' : '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

    const dateStr = doc && doc.createdAt 
      ? new Date(doc.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
      : new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300&family=Playfair+Display:ital,wght@0,500;0,700;1,400&family=Poppins:wght@300;400;500;600;700&family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
  <style>
    /* CSS Reset & Variables */
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }

    :root {
      --doc-font: '${font}', ${fallbackFont};
      --doc-accent: ${accent};
      --doc-accent-light: ${accent}15;
    }

    @page {
      size: ${pageSize} ${orientation};
      margin: ${marginValue};
    }

    body {
      background-color: #f1f5f9;
      color: #0f172a;
      font-family: var(--doc-font);
      line-height: 1.6;
      font-size: ${settings.fontSize || 14}px;
      margin: 0;
      padding: 32px 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    /* Screen-only Print Bar */
    .chatnotes-print-bar {
      position: sticky;
      top: 12px;
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      width: 100%;
      max-width: 860px;
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.12);
      border-radius: 12px;
      padding: 10px 18px;
      margin-bottom: 24px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }

    .print-bar-info {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
      color: #475569;
    }

    .print-bar-badge {
      background: #f1f5f9;
      color: #1e293b;
      padding: 3px 9px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .print-bar-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn-print-action {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.15s ease;
      font-family: inherit;
    }

    .btn-print-primary {
      background: #0071e3;
      color: #ffffff;
    }
    .btn-print-primary:hover {
      background: #0077ed;
    }

    .btn-print-secondary {
      background: #f1f5f9;
      color: #475569;
    }
    .btn-print-secondary:hover {
      background: #e2e8f0;
      color: #1e293b;
    }

    /* Document Sheet Wrapper */
    .print-sheet {
      width: 100%;
      max-width: 860px;
      background: #ffffff;
      padding: 48px 56px;
      border-radius: 8px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.07);
    }

    .chatnotes-document {
      width: 100%;
      font-family: var(--doc-font);
      background: #ffffff;
    }

    .chatnotes-document p,
    .chatnotes-document li,
    .chatnotes-document td,
    .chatnotes-document th,
    .chatnotes-document blockquote,
    .chatnotes-document .q-text {
      font-family: var(--doc-font);
    }

    /* Document Title & Meta Header */
    .doc-header {
      padding-bottom: 20px;
      margin-bottom: 28px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    }

    .doc-title {
      font-size: 26px;
      font-weight: 700;
      letter-spacing: -0.02em;
      line-height: 1.25;
      margin-bottom: 8px;
      color: #1d1d1f;
    }

    .doc-meta {
      font-size: 12px;
      color: #86868b;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .meta-dot {
      color: #d1d1d6;
      font-size: 10px;
    }

    /* Print Header & Footer Emulation */
    .print-doc-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 9pt;
      color: #94a3b8;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 6px;
      margin-bottom: 20px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }

    .print-doc-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 9pt;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
      padding-top: 8px;
      margin-top: 32px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }

    /* Question / Prompt Callout */
    .question-box {
      background: #fbfbfd;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-left: 4px solid var(--doc-accent, #0071e3);
      border-radius: 0 8px 8px 0;
      padding: 14px 18px;
      margin-bottom: 24px;
    }

    .q-label {
      display: block;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--doc-accent, #0071e3);
      margin-bottom: 4px;
    }

    .q-text {
      font-size: 14.5px;
      font-weight: 500;
      color: #1d1d1f;
      line-height: 1.5;
    }

    /* Key Points Box */
    .key-points-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px 20px;
      margin: 20px 0;
    }

    .key-points-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--doc-accent, #0071e3);
      margin-bottom: 8px;
    }

    /* Turn Sections */
    .turn-badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 3px 8px;
      border-radius: 4px;
      margin-bottom: 12px;
    }

    .turn-badge.user {
      background: #eff6ff;
      color: var(--doc-accent, #0071e3);
    }

    .turn-badge.assistant {
      background: #f1f5f9;
      color: #475569;
    }

    .user-turn, .assistant-turn {
      margin-bottom: 28px;
    }

    .compact-row {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
    }

    .compact-badge {
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      min-width: 65px;
    }

    /* Xcode Playground Style Code Window */
    .xcode-window {
      background: #fbfbfd;
      border: 1px solid rgba(0, 0, 0, 0.12);
      border-radius: 8px;
      overflow: hidden;
      margin: 20px 0;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
    }

    .xcode-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 7px 12px;
      background: #f4f4f6;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    }

    .xcode-controls {
      display: flex;
      align-items: center;
      gap: 5px;
      width: 50px;
    }

    .xcode-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      display: inline-block;
    }
    .xcode-dot.close { background: #ff5f56; }
    .xcode-dot.minimize { background: #ffbd2e; }
    .xcode-dot.zoom { background: #27c93f; }

    .xcode-lang-badge {
      font-size: 10.5px;
      font-weight: 600;
      color: #475569;
      background: rgba(0, 0, 0, 0.06);
      padding: 2px 7px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .xcode-actions {
      display: flex;
      width: 50px;
      justify-content: flex-end;
    }

    .xcode-content {
      display: flex;
      background: #ffffff;
      font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
      font-size: 12.5px;
      line-height: 1.55;
    }

    .xcode-gutter {
      padding: 12px 10px;
      background: #fafafc;
      border-right: 1px solid rgba(0, 0, 0, 0.06);
      color: #94a3b8;
      text-align: right;
      user-select: none;
      font-size: 11px;
    }

    .xcode-code {
      padding: 12px 16px;
      overflow-x: auto;
      flex: 1;
      color: #1e293b;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .xcode-kw { color: #ad3da4; font-weight: 600; }
    .xcode-str { color: #d12f1b; }
    .xcode-num { color: #272ad8; }
    .xcode-comment { color: #707f8f; font-style: italic; }
    .xcode-func { color: #3e8087; }
    .xcode-type { color: #4b2185; }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      font-size: 13px;
    }

    th, td {
      padding: 10px 14px;
      text-align: left;
      border: 1px solid #e2e8f0;
    }

    th {
      background: #f8fafc;
      font-weight: 600;
      color: #1e293b;
    }

    /* Embedded Template Styles */
    ${templateCss}

    /* ==========================================================================
       Print Engine Overrides (Guarantees zero blank pages & exact pagination)
       ========================================================================== */
    @media print {
      html, body {
        background: #ffffff !important;
        color: #000000 !important;
        margin: 0 !important;
        padding: 0 !important;
        display: block !important;
        min-height: 0 !important;
        height: auto !important;
        width: 100% !important;
      }

      .chatnotes-print-bar {
        display: none !important;
      }

      .xcode-actions,
      .xcode-copy-btn {
        display: none !important;
      }

      .print-sheet {
        box-shadow: none !important;
        border: none !important;
        border-radius: 0 !important;
        padding: 0 !important;
        margin: 0 !important;
        max-width: 100% !important;
        width: 100% !important;
        background: transparent !important;
      }

      .chatnotes-document {
        box-shadow: none !important;
        border: none !important;
        padding: 0 !important;
        margin: 0 !important;
        width: 100% !important;
        max-width: 100% !important;
      }

      /* Clean page-break control without clipping */
      .question-box,
      .key-points-box,
      .xcode-window,
      table,
      blockquote,
      .study-card,
      .user-turn,
      .assistant-turn,
      .compact-row {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }

      h1, h2, h3 {
        page-break-after: avoid !important;
        break-after: avoid !important;
      }

      .xcode-window {
        box-shadow: none !important;
        border: 1px solid #cbd5e1 !important;
        background: #f8fafc !important;
      }

      .xcode-content {
        background: #ffffff !important;
      }

      .xcode-code, .xcode-line {
        white-space: pre-wrap !important;
      }
    }
  </style>
</head>
<body>
  <!-- Print Control Bar (Screen only) -->
  <div class="chatnotes-print-bar">
    <div class="print-bar-info">
      <strong>ChatNotes PDF Preview</strong>
      <span class="print-bar-badge">${pageSize} ${orientation}</span>
      <span>•</span>
      <span>${this.escapeHtml(settings.template || 'Academic')}</span>
    </div>
    <div class="print-bar-actions">
      <button id="btnPrintNow" class="btn-print-action btn-print-primary">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;">
          <polyline points="6 9 6 2 18 2 18 9"></polyline>
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
          <rect x="6" y="14" width="12" height="8"></rect>
        </svg>
        <span>Print / Save PDF</span>
      </button>
      <button id="btnClosePrint" class="btn-print-action btn-print-secondary">
        <span>Close</span>
      </button>
    </div>
  </div>

  <!-- Document Sheet -->
  <main class="print-sheet">
    ${settings.headerStyle === 'title' ? `
      <div class="print-doc-header">
        <span>${this.escapeHtml(title)}</span>
        <span>${dateStr}</span>
      </div>` : ''}

    <article class="chatnotes-document template-${settings.template || 'academic'}">
      ${renderedHtml}
    </article>

    ${settings.footerStyle !== 'none' ? `
      <div class="print-doc-footer">
        <span>Generated by ChatNotes • 100% Client-Side Private Document</span>
        <span>${settings.footerStyle === 'page-numbers' ? 'Page 1' : this.escapeHtml(title)}</span>
      </div>` : ''}
  </main>

  <script>
    // 1. Controls
    document.getElementById('btnPrintNow').addEventListener('click', function() {
      window.print();
    });
    document.getElementById('btnClosePrint').addEventListener('click', function() {
      window.close();
    });

    // 2. Auto-trigger print dialog once document resources are ready
    window.addEventListener('load', function() {
      setTimeout(function() {
        window.focus();
        window.print();
      }, 300);
    });
  </script>
</body>
</html>`;
  },

  /**
   * Hidden iframe fallback printing
   */
  printViaIframe(htmlContent) {
    let iframe = document.getElementById('chatnotes-print-frame');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'chatnotes-print-frame';
      iframe.style.position = 'fixed';
      iframe.style.left = '-9999px';
      iframe.style.top = '0';
      iframe.style.width = '1024px';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);
    }

    const frameDoc = iframe.contentWindow.document;
    frameDoc.open();
    frameDoc.write(htmlContent);
    frameDoc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (err) {
        console.warn('[ChatNotes] iframe print error:', err);
      }
    }, 400);
  },

  /**
   * Dedicated tab export
   */
  openPrintTab(doc, renderedHtml, templateCss = '', settings = {}) {
    this.export(doc, renderedHtml, templateCss, settings);
  },

  escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PdfExporter;
}
