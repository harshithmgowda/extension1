/**
 * ChatNotes - HTML Exporter
 * Generates standalone, self-contained HTML documents with embedded CSS.
 */

const HtmlExporter = {
  /**
   * Generate complete standalone HTML file content
   * @param {object} doc Structured document model
   * @param {string} renderedHtml Inner HTML of document body
   * @param {string} templateCss Embedded CSS styles
   * @param {object} settings Customization preferences
   * @returns {string} Standalone HTML markup
   */
  generate(doc, renderedHtml, templateCss = '', settings = {}) {
    const title = doc.title || 'ChatNotes Document';
    const font = settings.font || 'Inter';
    const accent = settings.accentColor || '#0071e3';
    const isDark = settings.template === 'dark' || settings.template === 'cyberpunk';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="generator" content="ChatNotes Chrome Extension">
  <title>${this.escapeHtml(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300&family=Playfair+Display:ital,wght@0,500;0,700;1,400&family=Poppins:wght@300;400;500;600;700&family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
  <style>
    /* Reset & Base Canvas */
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    
    :root {
      --doc-font: '${font}', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      --doc-accent: ${accent};
    }

    body {
      background-color: ${isDark ? '#0b0f19' : '#f1f5f9'};
      color: ${isDark ? '#e2e8f0' : '#0f172a'};
      font-family: var(--doc-font);
      padding: 40px 20px;
      display: flex;
      justify-content: center;
      min-height: 100vh;
    }

    .chatnotes-document {
      width: 100%;
      max-width: 860px;
      background: #ffffff;
      padding: 56px 64px;
      border-radius: 8px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
      position: relative;
      font-family: var(--doc-font);
    }

    .chatnotes-document p,
    .chatnotes-document li,
    .chatnotes-document td,
    .chatnotes-document th,
    .chatnotes-document blockquote,
    .chatnotes-document .q-text {
      font-family: var(--doc-font);
    }

    /* Core Typography & Components */
    .chatnotes-document .doc-header {
      padding-bottom: 24px;
      margin-bottom: 32px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    }

    .chatnotes-document .doc-title {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.02em;
      line-height: 1.25;
      margin-bottom: 8px;
    }

    .chatnotes-document .doc-meta {
      font-size: 12px;
      color: #86868b;
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 400;
    }

    .chatnotes-document .question-box {
      background: #fbfbfd;
      border: 1px solid rgba(0, 0, 0, 0.06);
      border-left: 3px solid var(--doc-accent, #0071e3);
      border-radius: 0 8px 8px 0;
      padding: 14px 18px;
      margin-bottom: 28px;
    }

    .chatnotes-document .q-label {
      display: block;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--doc-accent, #0071e3);
      margin-bottom: 4px;
    }

    .chatnotes-document .q-text {
      font-size: 14.5px;
      font-weight: 500;
      line-height: 1.5;
    }

    .chatnotes-document .key-points-box {
      background: rgba(0, 113, 227, 0.03);
      border: 1px solid rgba(0, 113, 227, 0.15);
      border-radius: 8px;
      padding: 16px 20px;
      margin: 22px 0;
    }

    .chatnotes-document .key-points-title {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--doc-accent, #0071e3);
      margin-bottom: 10px;
    }

    .chatnotes-document .key-points-box ul,
    .chatnotes-document .key-points-box ol {
      padding-left: 20px;
      margin: 0;
    }

    .chatnotes-document .key-points-box li {
      margin-bottom: 6px;
      font-size: 13.5px;
      line-height: 1.5;
    }

    .chatnotes-document .turn-badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 980px;
      margin-bottom: 8px;
    }

    .chatnotes-document .turn-badge.user {
      background: rgba(0, 113, 227, 0.1);
      color: #0071e3;
    }

    .chatnotes-document .turn-badge.assistant {
      background: rgba(52, 199, 89, 0.1);
      color: #15803d;
    }

    .chatnotes-document p {
      margin-bottom: 14px;
      font-size: 14px;
      line-height: 1.65;
    }

    .chatnotes-document h1,
    .chatnotes-document h2,
    .chatnotes-document h3 {
      font-weight: 600;
      letter-spacing: -0.015em;
      margin-top: 26px;
      margin-bottom: 10px;
    }

    .chatnotes-document h2 { font-size: 18px; }
    .chatnotes-document h3 { font-size: 15px; }

    .chatnotes-document table {
      width: 100%;
      border-collapse: collapse;
      margin: 24px 0;
      font-size: 13px;
    }

    .chatnotes-document th {
      background: #f5f5f7;
      font-weight: 600;
      text-align: left;
      padding: 8px 12px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    }

    .chatnotes-document td {
      padding: 10px 12px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    }

    .chatnotes-document blockquote {
      border-left: 2px solid #86868b;
      padding-left: 14px;
      margin: 18px 0;
      font-style: italic;
    }

    /* Apple Xcode Playground Style */
    .xcode-window {
      background: #fbfbfd;
      border: 1px solid rgba(0, 0, 0, 0.1);
      border-radius: 9px;
      overflow: hidden;
      margin: 22px 0;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.04);
    }

    .xcode-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 14px;
      background: linear-gradient(180deg, #fdfdfe 0%, #f4f4f6 100%);
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
      user-select: none;
    }

    .xcode-controls {
      display: flex;
      align-items: center;
      gap: 6px;
      width: 60px;
    }

    .xcode-dot {
      width: 10.5px;
      height: 10.5px;
      border-radius: 50%;
      display: inline-block;
    }

    .xcode-dot.close { background: #ff5f56; border: 0.5px solid #e0443e; }
    .xcode-dot.minimize { background: #ffbd2e; border: 0.5px solid #dea123; }
    .xcode-dot.zoom { background: #27c93f; border: 0.5px solid #1aab29; }

    .xcode-title {
      display: flex;
      align-items: center;
    }

    .xcode-lang-badge {
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.05em;
      color: #555558;
      background: rgba(0, 0, 0, 0.05);
      padding: 2px 8px;
      border-radius: 4px;
    }

    .xcode-actions {
      display: flex;
      align-items: center;
      width: 60px;
      justify-content: flex-end;
    }

    .xcode-copy-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.12);
      padding: 3px 8px;
      border-radius: 5px;
      font-size: 11px;
      font-weight: 500;
      color: #4b5563;
      cursor: pointer;
    }

    .xcode-copy-btn svg { width: 12px; height: 12px; }

    .xcode-content {
      display: flex;
      overflow-x: auto;
      background: #ffffff;
      padding: 12px 0;
    }

    .xcode-gutter {
      display: flex;
      flex-direction: column;
      padding: 0 12px;
      border-right: 1px solid rgba(0, 0, 0, 0.06);
      user-select: none;
      text-align: right;
    }

    .gutter-num {
      font-family: "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace;
      font-size: 12px;
      line-height: 1.6;
      color: #a1a1aa;
    }

    .xcode-code {
      flex: 1;
      margin: 0;
      padding: 0 16px;
      overflow-x: auto;
      font-family: "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace;
      font-size: 12.5px;
      line-height: 1.6;
      color: #24292f;
      background: transparent;
    }

    .xcode-line { white-space: pre; }

    /* Xcode Light Syntax Colors */
    .xcode-kw { color: #9b2393; font-weight: 600; }
    .xcode-str { color: #c41a16; }
    .xcode-num { color: #1c00cf; }
    .xcode-comment { color: #5d6c79; font-style: italic; }
    .xcode-func { color: #326d74; }
    .xcode-type { color: #3900a0; font-weight: 500; }
    .xcode-builtin { color: #836c28; }
    .xcode-lit { color: #1c00cf; font-weight: 500; }
    .xcode-op { color: #24292f; }

    /* Xcode Dark Variant */
    .template-dark .xcode-window,
    .template-cyberpunk .xcode-window {
      background: #1e1e24;
      border-color: rgba(255, 255, 255, 0.1);
    }
    .template-dark .xcode-header,
    .template-cyberpunk .xcode-header {
      background: #282830;
      border-bottom-color: rgba(255, 255, 255, 0.08);
    }
    .template-dark .xcode-content,
    .template-cyberpunk .xcode-content {
      background: #16161c;
    }
    .template-dark .xcode-code,
    .template-cyberpunk .xcode-code {
      color: #e5e7eb;
    }
    .template-dark .xcode-kw,
    .template-cyberpunk .xcode-kw { color: #fc5fa3; }
    .template-dark .xcode-str,
    .template-cyberpunk .xcode-str { color: #fc6a5d; }
    .template-dark .xcode-num,
    .template-cyberpunk .xcode-num { color: #9686f5; }
    .template-dark .xcode-comment,
    .template-cyberpunk .xcode-comment { color: #6c7986; }
    .template-dark .xcode-func,
    .template-cyberpunk .xcode-func { color: #67b7a4; }

    /* Embedded Template Styles */
    ${templateCss}

    /* Print media optimization */
    @media print {
      body {
        background: transparent !important;
        padding: 0 !important;
      }
      .chatnotes-document {
        box-shadow: none !important;
        border: none !important;
        max-width: 100% !important;
        padding: 0 !important;
      }
      .question-box, .xcode-window, table, .key-points-box {
        page-break-inside: avoid;
        break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <article class="chatnotes-document template-${settings.template || 'academic'}">
    ${renderedHtml}
  </article>

  <script>
    // Copy code button handler
    document.querySelectorAll('.xcode-copy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const rawCode = decodeURIComponent(btn.getAttribute('data-code') || '');
        navigator.clipboard.writeText(rawCode).then(() => {
          const original = btn.innerHTML;
          btn.innerHTML = '<span>Copied!</span>';
          setTimeout(() => { btn.innerHTML = original; }, 1800);
        });
      });
    });
  </script>
</body>
</html>`;
  },

  escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  /**
   * Trigger local browser download
   */
  download(content, filename = 'notes.html') {
    const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = HtmlExporter;
}
