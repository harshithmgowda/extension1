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
    const accent = settings.accentColor || '#4f46e5';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="generator" content="ChatNotes Chrome Extension">
  <title>${this.escapeHtml(title)}</title>
  <style>
    /* Reset & Base Print Layout */
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      background-color: #f1f5f9;
      color: #0f172a;
      font-family: '${font}', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 40px 20px;
      display: flex;
      justify-content: center;
    }

    .chatnotes-document {
      width: 100%;
      max-width: 820px;
      background: #ffffff;
      padding: 48px;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      position: relative;
    }

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
      .question-box, pre, table, .key-points-box {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <article class="chatnotes-document template-${settings.template || 'academic'}">
    ${renderedHtml}
  </article>
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
