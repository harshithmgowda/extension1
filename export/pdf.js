/**
 * ChatNotes - PDF Exporter & Generator
 * Generates valid, vector-crisp, multi-page PDF (.pdf) documents client-side.
 * 100% offline, zero external servers, zero CSP issues.
 * Preserves Xcode code blocks with Apple dots & line numbers, tables, callouts, headers, and footers.
 * Supports direct .pdf file download and native in-page printing.
 */

const PdfExporter = {
  /**
   * Generates and downloads native .pdf file from document model
   * @param {object} doc Structured document model
   * @param {'exact'|'study'|'compact'} mode
   * @param {string} filename
   * @param {object} settings Customization settings
   */
  download(doc, mode = 'study', filename = 'notes.pdf', settings = {}) {
    const pdfBytes = this.generatePdf(doc, mode, settings);
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 150);
  },

  /**
   * Compatibility wrapper for existing export button
   */
  export(doc, renderedHtml, templateCss = '', settings = {}) {
    const title = (doc && doc.title) ? doc.title : 'notes';
    const safeTitle = title.replace(/[^a-z0-9_-]/gi, '_');
    this.download(doc, settings.exportMode || 'study', `${safeTitle}.pdf`, settings);
  },

  /**
   * Direct in-page browser print to PDF / printer
   */
  print(doc, settings = {}) {
    const canvasScroll = document.querySelector('.canvas-scroll');
    const savedScroll = canvasScroll ? canvasScroll.scrollTop : 0;
    if (canvasScroll) canvasScroll.scrollTop = 0;

    const cleanup = () => {
      if (canvasScroll) canvasScroll.scrollTop = savedScroll;
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup, { once: true });
    setTimeout(cleanup, 4000);

    try {
      window.print();
    } catch (err) {
      console.warn('[ChatNotes] window.print error, triggering direct PDF download instead:', err);
      this.export(doc, '', '', settings);
    }
  },

  /**
   * Synthesizes binary PDF 1.4 document
   * @param {object} doc Canonical document model
   * @param {'exact'|'study'|'compact'} mode
   * @param {object} settings
   * @returns {Uint8Array} Binary PDF data
   */
  generatePdf(doc, mode = 'study', settings = {}) {
    const title = (doc && doc.title) ? doc.title : 'Conversation Notes';
    const pageSize = (settings.pageSize || 'a4').toLowerCase();
    const orientation = settings.orientation || 'portrait';
    const accentHex = settings.accentColor || '#0071e3';
    const accentRgb = this.hexToRgb(accentHex, [0, 0.443, 0.89]);

    // Page dimensions in PDF points (1/72 inch)
    const PAGE_SIZES = {
      a4: [595.28, 841.89],
      letter: [612.0, 792.0],
      a5: [419.53, 595.28]
    };

    let [pageWidth, pageHeight] = PAGE_SIZES[pageSize] || PAGE_SIZES.a4;
    if (orientation === 'landscape') {
      const temp = pageWidth;
      pageWidth = pageHeight;
      pageHeight = temp;
    }

    const marginMap = { small: 32, normal: 44, large: 58 };
    const margin = marginMap[settings.margins] || 44;
    const contentWidth = pageWidth - (margin * 2);

    // Format content using DocumentFormatter if available
    const formatted = (typeof DocumentFormatter !== 'undefined')
      ? DocumentFormatter.format(doc, mode)
      : { title, sections: [] };

    // Layout builder
    const builder = new PdfBuilder(pageWidth, pageHeight, margin, contentWidth, accentRgb, title, settings);

    // 1. Title & Metadata Header
    builder.drawDocumentHeader(formatted.title, doc, mode);

    // 2. Render each section
    if (Array.isArray(formatted.sections)) {
      for (const sec of formatted.sections) {
        if (sec.type === 'study-card') {
          builder.drawPromptBox(sec.question);
          if (Array.isArray(sec.blocks)) {
            for (const block of sec.blocks) {
              builder.drawBlock(block);
            }
          }
        } else if (sec.type === 'user-turn' || sec.type === 'assistant-turn') {
          builder.drawTurnHeader(sec.badge, sec.type === 'user-turn');
          if (Array.isArray(sec.blocks)) {
            for (const block of sec.blocks) {
              builder.drawBlock(block);
            }
          }
        } else {
          // Compact mode
          builder.drawCompactRow(sec.badge, sec.blocks);
        }
      }
    }

    // 3. Finalize pages and compile binary
    return builder.compilePdf();
  },

  hexToRgb(hex, fallback = [0, 0, 0]) {
    if (!hex || typeof hex !== 'string') return fallback;
    hex = hex.replace('#', '').trim();
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }
    if (hex.length !== 6) return fallback;
    const num = parseInt(hex, 16);
    if (isNaN(num)) return fallback;
    return [
      Math.round(((num >> 16) & 255) / 255 * 1000) / 1000,
      Math.round(((num >> 8) & 255) / 255 * 1000) / 1000,
      Math.round((num & 255) / 255 * 1000) / 1000
    ];
  }
};

/**
 * PDF Layout & Stream Compiler
 */
class PdfBuilder {
  constructor(pageWidth, pageHeight, margin, contentWidth, accentRgb, title, settings) {
    this.pageWidth = pageWidth;
    this.pageHeight = pageHeight;
    this.margin = margin;
    this.contentWidth = contentWidth;
    this.accentRgb = accentRgb;
    this.title = title;
    this.settings = settings;

    this.pages = [];
    this.currentOps = [];
    this.currentY = pageHeight - margin;
    this.pageCount = 0;

    this.startNewPage(true);
  }

  startNewPage(isFirst = false) {
    if (this.currentOps.length > 0) {
      this.pages.push(this.currentOps.join('\n'));
    }
    this.currentOps = [];
    this.currentY = this.pageHeight - this.margin;
    this.pageCount++;

    // Draw running header on subsequent pages
    if (!isFirst && this.settings.headerStyle !== 'none') {
      const topY = this.pageHeight - this.margin + 12;
      // Divider rule
      this.currentOps.push(`0.85 0.88 0.92 RG 0.5 w`);
      this.currentOps.push(`${this.margin} ${topY - 4} m ${this.pageWidth - this.margin} ${topY - 4} l S`);

      // Header title
      const truncTitle = this.truncateText(this.title, this.contentWidth - 80, 8);
      this.currentOps.push(`BT /F1 8 Tf 0.45 0.52 0.6 rg`);
      this.currentOps.push(`${this.margin} ${topY} Td (${this.escapePdf(truncTitle)}) Tj ET`);

      // Header date
      const dateStr = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
      const dateW = this.measureText(dateStr, 8);
      this.currentOps.push(`BT /F1 8 Tf 0.45 0.52 0.6 rg`);
      this.currentOps.push(`${this.pageWidth - this.margin - dateW} ${topY} Td (${this.escapePdf(dateStr)}) Tj ET`);

      this.currentY -= 16;
    }
  }

  ensureSpace(neededHeight) {
    const bottomLimit = this.margin + 32;
    if (this.currentY - neededHeight < bottomLimit) {
      this.startNewPage(false);
    }
  }

  drawDocumentHeader(titleText, doc, mode) {
    const titleLines = this.wrapText(titleText, this.contentWidth, 18);
    const needed = (titleLines.length * 24) + 36;
    this.ensureSpace(needed);

    // Title text
    for (const line of titleLines) {
      this.currentOps.push(`BT /F2 18 Tf 0.08 0.12 0.18 rg`);
      this.currentOps.push(`${this.margin} ${this.currentY} Td (${this.escapePdf(line)}) Tj ET`);
      this.currentY -= 24;
    }

    // Accent Underline
    this.currentOps.push(`${this.accentRgb.join(' ')} RG 2.25 w`);
    this.currentOps.push(`${this.margin} ${this.currentY + 8} m ${this.margin + 64} ${this.currentY + 8} l S`);
    this.currentY -= 10;

    // Meta Badge
    const stats = (doc && doc.stats) ? doc.stats : {};
    const dateStr = (doc && doc.createdAt) 
      ? new Date(doc.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
      : new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    const metaStr = `${dateStr}   •   ${mode.toUpperCase()}   •   ~${stats.totalWords || 0} words   •   ${stats.totalTurns || 0} turns`;

    this.currentOps.push(`BT /F1 8.5 Tf 0.45 0.52 0.6 rg`);
    this.currentOps.push(`${this.margin} ${this.currentY} Td (${this.escapePdf(metaStr)}) Tj ET`);
    this.currentY -= 26;
  }

  drawPromptBox(questionText) {
    if (!questionText) return;
    const lines = this.wrapText(questionText, this.contentWidth - 28, 10);
    const boxH = 14 + (lines.length * 15) + 10;
    this.ensureSpace(boxH + 16);

    // Background fill & border
    this.currentOps.push(`0.975 0.98 0.99 rg 0.88 0.91 0.94 RG 0.5 w`);
    this.currentOps.push(`${this.margin} ${this.currentY - boxH} ${this.contentWidth} ${boxH} re B`);

    // Accent Left Stripe
    this.currentOps.push(`${this.accentRgb.join(' ')} rg`);
    this.currentOps.push(`${this.margin} ${this.currentY - boxH} 3.5 ${boxH} re f`);

    // Label: PROMPT
    this.currentOps.push(`BT /F2 7.5 Tf ${this.accentRgb.join(' ')} rg`);
    this.currentOps.push(`${this.margin + 12} ${this.currentY - 13} Td (PROMPT) Tj ET`);

    // Question lines
    let lineY = this.currentY - 26;
    for (const l of lines) {
      this.currentOps.push(`BT /F1 10 Tf 0.1 0.12 0.16 rg`);
      this.currentOps.push(`${this.margin + 12} ${lineY} Td (${this.escapePdf(l)}) Tj ET`);
      lineY -= 15;
    }

    this.currentY -= (boxH + 18);
  }

  drawTurnHeader(badgeText, isUser) {
    this.ensureSpace(24);
    const badgeW = this.measureText(badgeText.toUpperCase(), 7.5) + 12;
    const badgeH = 14;

    if (isUser) {
      this.currentOps.push(`${this.accentRgb.join(' ')} rg`);
      this.currentOps.push(`${this.margin} ${this.currentY - badgeH} ${badgeW} ${badgeH} re f`);
      this.currentOps.push(`BT /F2 7.5 Tf 1 1 1 rg`);
      this.currentOps.push(`${this.margin + 6} ${this.currentY - 10} Td (${this.escapePdf(badgeText.toUpperCase())}) Tj ET`);
    } else {
      this.currentOps.push(`0.91 0.93 0.95 rg`);
      this.currentOps.push(`${this.margin} ${this.currentY - badgeH} ${badgeW} ${badgeH} re f`);
      this.currentOps.push(`BT /F2 7.5 Tf 0.25 0.3 0.36 rg`);
      this.currentOps.push(`${this.margin + 6} ${this.currentY - 10} Td (${this.escapePdf(badgeText.toUpperCase())}) Tj ET`);
    }
    this.currentY -= 20;
  }

  drawCompactRow(badgeText, blocks) {
    this.drawTurnHeader(badgeText || 'Note', false);
    if (Array.isArray(blocks)) {
      for (const b of blocks) {
        this.drawBlock(b);
      }
    }
  }

  drawBlock(block) {
    if (!block) return;

    switch (block.type) {
      case 'paragraph': {
        const text = block.text || '';
        const lines = this.wrapText(text, this.contentWidth, 9.5);
        this.ensureSpace(lines.length * 14 + 6);
        for (const line of lines) {
          this.currentOps.push(`BT /F1 9.5 Tf 0.12 0.15 0.2 rg`);
          this.currentOps.push(`${this.margin} ${this.currentY} Td (${this.escapePdf(line)}) Tj ET`);
          this.currentY -= 14;
        }
        this.currentY -= 6;
        break;
      }

      case 'heading': {
        const level = block.level || 2;
        const text = block.text || '';
        if (level === 1) {
          const lines = this.wrapText(text, this.contentWidth, 14);
          this.ensureSpace(lines.length * 18 + 14);
          this.currentY -= 8;
          for (const line of lines) {
            this.currentOps.push(`BT /F2 14 Tf 0.08 0.12 0.18 rg`);
            this.currentOps.push(`${this.margin} ${this.currentY} Td (${this.escapePdf(line)}) Tj ET`);
            this.currentY -= 18;
          }
          this.currentY -= 4;
        } else if (level === 2) {
          const lines = this.wrapText(text, this.contentWidth, 12);
          this.ensureSpace(lines.length * 16 + 14);
          this.currentY -= 6;
          for (const line of lines) {
            this.currentOps.push(`BT /F2 12 Tf 0.1 0.14 0.22 rg`);
            this.currentOps.push(`${this.margin} ${this.currentY} Td (${this.escapePdf(line)}) Tj ET`);
            this.currentY -= 16;
          }
          // Subtle underline for H2
          this.currentOps.push(`0.88 0.91 0.94 RG 0.5 w`);
          this.currentOps.push(`${this.margin} ${this.currentY + 10} m ${this.pageWidth - this.margin} ${this.currentY + 10} l S`);
          this.currentY -= 4;
        } else {
          const lines = this.wrapText(text, this.contentWidth, 10.5);
          this.ensureSpace(lines.length * 14 + 10);
          this.currentY -= 4;
          for (const line of lines) {
            this.currentOps.push(`BT /F2 10.5 Tf 0.15 0.18 0.25 rg`);
            this.currentOps.push(`${this.margin} ${this.currentY} Td (${this.escapePdf(line)}) Tj ET`);
            this.currentY -= 14;
          }
          this.currentY -= 2;
        }
        break;
      }

      case 'key-points': {
        const title = block.title || 'KEY POINTS';
        const items = (block.list && Array.isArray(block.list.items))
          ? block.list.items.map(it => (typeof it === 'string' ? it : it.text || ''))
          : [];
        this.drawKeyPointsBox(title, items);
        break;
      }

      case 'list': {
        const items = Array.isArray(block.items)
          ? block.items.map(it => (typeof it === 'string' ? it : it.text || ''))
          : [];
        const isOrdered = Boolean(block.ordered);
        this.drawListItems(items, isOrdered);
        break;
      }

      case 'code-highlight':
      case 'code': {
        const codeContent = block.code || (block.codeBlock ? block.codeBlock.code : '') || '';
        const lang = block.language || (block.codeBlock ? block.codeBlock.language : '') || '';
        this.drawXcodeCodeBlock(codeContent, lang);
        break;
      }

      case 'table': {
        const headers = Array.isArray(block.headers) ? block.headers : [];
        const rows = Array.isArray(block.rows) ? block.rows : [];
        this.drawTable(headers, rows);
        break;
      }

      case 'quote': {
        const text = block.text || '';
        const lines = this.wrapText(text, this.contentWidth - 18, 9.5);
        this.ensureSpace(lines.length * 14 + 12);
        const boxH = lines.length * 14 + 4;

        // Gray left stripe
        this.currentOps.push(`0.65 0.7 0.76 RG 2 w`);
        this.currentOps.push(`${this.margin + 2} ${this.currentY - boxH + 8} m ${this.margin + 2} ${this.currentY + 4} l S`);

        for (const line of lines) {
          this.currentOps.push(`BT /F3 9.5 Tf 0.35 0.4 0.48 rg`);
          this.currentOps.push(`${this.margin + 12} ${this.currentY} Td (${this.escapePdf(line)}) Tj ET`);
          this.currentY -= 14;
        }
        this.currentY -= 8;
        break;
      }
    }
  }

  drawKeyPointsBox(title, items) {
    if (!items || items.length === 0) return;
    const itemLinesList = items.map(it => this.wrapText(it, this.contentWidth - 36, 9.5));
    const totalLines = itemLinesList.reduce((acc, l) => acc + l.length, 0);
    const boxH = 22 + (totalLines * 14) + (items.length * 4) + 8;
    this.ensureSpace(boxH + 14);

    // Box fill & border
    this.currentOps.push(`0.975 0.98 0.99 rg 0.88 0.91 0.94 RG 0.5 w`);
    this.currentOps.push(`${this.margin} ${this.currentY - boxH} ${this.contentWidth} ${boxH} re B`);

    // Title
    this.currentOps.push(`BT /F2 8 Tf ${this.accentRgb.join(' ')} rg`);
    this.currentOps.push(`${this.margin + 14} ${this.currentY - 14} Td (${this.escapePdf(title.toUpperCase())}) Tj ET`);

    let curItY = this.currentY - 28;
    for (let i = 0; i < items.length; i++) {
      const lines = itemLinesList[i];
      // Accent bullet dot
      this.currentOps.push(`${this.accentRgb.join(' ')} rg`);
      this.currentOps.push(`${this.margin + 14} ${curItY - 2} 3 3 re f`);

      for (let j = 0; j < lines.length; j++) {
        this.currentOps.push(`BT /F1 9.5 Tf 0.12 0.16 0.22 rg`);
        this.currentOps.push(`${this.margin + 24} ${curItY} Td (${this.escapePdf(lines[j])}) Tj ET`);
        curItY -= 14;
      }
      curItY -= 4;
    }
    this.currentY -= (boxH + 16);
  }

  drawListItems(items, isOrdered) {
    for (let i = 0; i < items.length; i++) {
      const text = items[i];
      const prefix = isOrdered ? `${i + 1}.` : '•';
      const lines = this.wrapText(text, this.contentWidth - 20, 9.5);
      this.ensureSpace(lines.length * 14 + 4);

      // Bullet / Number prefix
      this.currentOps.push(`BT /F2 9.5 Tf ${this.accentRgb.join(' ')} rg`);
      this.currentOps.push(`${this.margin + 4} ${this.currentY} Td (${this.escapePdf(prefix)}) Tj ET`);

      // Text lines
      for (let j = 0; j < lines.length; j++) {
        this.currentOps.push(`BT /F1 9.5 Tf 0.12 0.16 0.22 rg`);
        this.currentOps.push(`${this.margin + 20} ${this.currentY} Td (${this.escapePdf(lines[j])}) Tj ET`);
        this.currentY -= 14;
      }
      this.currentY -= 3;
    }
    this.currentY -= 6;
  }

  drawXcodeCodeBlock(codeText, language) {
    const rawLines = codeText ? codeText.split('\n') : [''];
    const headerH = 18;
    const lineH = 12;
    const gutterW = 28;
    const maxChars = Math.floor((this.contentWidth - gutterW - 14) / 4.8);

    // Expand lines if wrapped
    const processedLines = [];
    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i].replace(/\t/g, '    ');
      if (line.length <= maxChars) {
        processedLines.push({ num: i + 1, text: line });
      } else {
        // Wrap long code line
        for (let k = 0; k < line.length; k += maxChars) {
          processedLines.push({
            num: k === 0 ? i + 1 : '',
            text: line.slice(k, k + maxChars)
          });
        }
      }
    }

    // Header space check
    this.ensureSpace(headerH + (Math.min(processedLines.length, 3) * lineH));

    // Draw Window Header Bar
    this.currentOps.push(`0.94 0.95 0.96 rg 0.82 0.85 0.88 RG 0.5 w`);
    this.currentOps.push(`${this.margin} ${this.currentY - headerH} ${this.contentWidth} ${headerH} re B`);

    // Authentic Apple Dots: Close (Red), Minimize (Yellow), Zoom (Green)
    this.currentOps.push(`1.0 0.37 0.34 rg`);
    this.currentOps.push(`${this.margin + 8} ${this.currentY - 11} 5.5 5.5 re f`);
    this.currentOps.push(`1.0 0.74 0.18 rg`);
    this.currentOps.push(`${this.margin + 17} ${this.currentY - 11} 5.5 5.5 re f`);
    this.currentOps.push(`0.15 0.79 0.25 rg`);
    this.currentOps.push(`${this.margin + 26} ${this.currentY - 11} 5.5 5.5 re f`);

    // Language Badge
    if (language) {
      const langBadge = language.toUpperCase();
      const badgeW = this.measureText(langBadge, 7.5, true) + 8;
      this.currentOps.push(`0.88 0.9 0.92 rg`);
      this.currentOps.push(`${this.margin + this.contentWidth - badgeW - 8} ${this.currentY - 14} ${badgeW} 10 re f`);
      this.currentOps.push(`BT /F5 7.5 Tf 0.35 0.42 0.5 rg`);
      this.currentOps.push(`${this.margin + this.contentWidth - badgeW - 4} ${this.currentY - 11.5} Td (${this.escapePdf(langBadge)}) Tj ET`);
    }
    this.currentY -= headerH;

    // Code Lines Loop with multi-page splitting
    for (let i = 0; i < processedLines.length; i++) {
      this.ensureSpace(lineH);
      const item = processedLines[i];

      // Gutter Background
      this.currentOps.push(`0.97 0.975 0.985 rg`);
      this.currentOps.push(`${this.margin} ${this.currentY - lineH} ${gutterW} ${lineH} re f`);

      // Gutter vertical separator line
      this.currentOps.push(`0.88 0.9 0.93 RG 0.5 w`);
      this.currentOps.push(`${this.margin + gutterW} ${this.currentY - lineH} m ${this.margin + gutterW} ${this.currentY} l S`);

      // Line Number in gutter
      if (item.num !== '') {
        const numStr = String(item.num);
        const numW = this.measureText(numStr, 7.5, true);
        this.currentOps.push(`BT /F4 7.5 Tf 0.6 0.65 0.72 rg`);
        this.currentOps.push(`${this.margin + gutterW - numW - 4} ${this.currentY - 9} Td (${numStr}) Tj ET`);
      }

      // Code text
      this.currentOps.push(`BT /F4 8 Tf 0.12 0.15 0.2 rg`);
      this.currentOps.push(`${this.margin + gutterW + 6} ${this.currentY - 9} Td (${this.escapePdf(item.text)}) Tj ET`);

      this.currentY -= lineH;
    }

    // Outer code frame
    this.currentOps.push(`0.85 0.88 0.91 RG 0.5 w`);
    this.currentY -= 14;
  }

  drawTable(headers, rows) {
    if (!headers || headers.length === 0) return;
    const colCount = Math.max(headers.length, 1);
    const colW = this.contentWidth / colCount;
    const rowH = 18;

    this.ensureSpace(rowH * 2);

    // Header row background
    this.currentOps.push(`0.94 0.95 0.97 rg 0.82 0.85 0.88 RG 0.5 w`);
    this.currentOps.push(`${this.margin} ${this.currentY - rowH} ${this.contentWidth} ${rowH} re B`);

    for (let c = 0; c < headers.length; c++) {
      const cellX = this.margin + (c * colW);
      if (c > 0) {
        this.currentOps.push(`0.82 0.85 0.88 RG 0.5 w`);
        this.currentOps.push(`${cellX} ${this.currentY - rowH} m ${cellX} ${this.currentY} l S`);
      }
      const text = this.truncateText(String(headers[c] || ''), colW - 8, 8);
      this.currentOps.push(`BT /F2 8 Tf 0.1 0.14 0.2 rg`);
      this.currentOps.push(`${cellX + 5} ${this.currentY - 12.5} Td (${this.escapePdf(text)}) Tj ET`);
    }
    this.currentY -= rowH;

    // Data rows
    for (let r = 0; r < rows.length; r++) {
      this.ensureSpace(rowH);
      const row = rows[r];
      const bg = (r % 2 === 0) ? `1.0 1.0 1.0` : `0.975 0.98 0.99`;
      this.currentOps.push(`${bg} rg 0.88 0.91 0.94 RG 0.5 w`);
      this.currentOps.push(`${this.margin} ${this.currentY - rowH} ${this.contentWidth} ${rowH} re B`);

      for (let c = 0; c < colCount; c++) {
        const cellX = this.margin + (c * colW);
        if (c > 0) {
          this.currentOps.push(`0.88 0.91 0.94 RG 0.5 w`);
          this.currentOps.push(`${cellX} ${this.currentY - rowH} m ${cellX} ${this.currentY} l S`);
        }
        const val = (row && row[c] !== undefined) ? String(row[c]) : '';
        const text = this.truncateText(val, colW - 8, 8);
        this.currentOps.push(`BT /F1 8 Tf 0.15 0.18 0.22 rg`);
        this.currentOps.push(`${cellX + 5} ${this.currentY - 12.5} Td (${this.escapePdf(text)}) Tj ET`);
      }
      this.currentY -= rowH;
    }
    this.currentY -= 14;
  }

  wrapText(text, maxWidth, fontSize) {
    if (!text) return [];
    const words = String(text).split(/\s+/);
    const lines = [];
    let currentLine = '';

    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      if (this.measureText(candidate, fontSize) <= maxWidth) {
        currentLine = candidate;
      } else {
        if (currentLine) lines.push(currentLine);
        if (this.measureText(word, fontSize) > maxWidth) {
          let chunk = '';
          for (const char of word) {
            if (this.measureText(chunk + char, fontSize) <= maxWidth) {
              chunk += char;
            } else {
              lines.push(chunk);
              chunk = char;
            }
          }
          currentLine = chunk;
        } else {
          currentLine = word;
        }
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  truncateText(text, maxWidth, fontSize) {
    if (this.measureText(text, fontSize) <= maxWidth) return text;
    let t = text;
    while (t.length > 0 && this.measureText(t + '...', fontSize) > maxWidth) {
      t = t.slice(0, -1);
    }
    return t ? `${t}...` : '';
  }

  measureText(text, fontSize, isMono = false) {
    if (!text) return 0;
    if (isMono) return text.length * (fontSize * 0.6);
    let w = 0;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === ' ') w += fontSize * 0.32;
      else if ('iltjI1.,;:!|()[]{}'.indexOf(c) !== -1) w += fontSize * 0.28;
      else if ('wmWM@#%&'.indexOf(c) !== -1) w += fontSize * 0.85;
      else if (c >= 'A' && c <= 'Z') w += fontSize * 0.66;
      else w += fontSize * 0.52;
    }
    return w;
  }

  escapePdf(str) {
    if (!str) return '';
    return String(str)
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/[\r\n\t]/g, ' ')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2013\u2014]/g, '-')
      .replace(/\u2022/g, '*')
      .replace(/\u2026/g, '...')
      .replace(/[\x00-\x1F\x7F-\xFF]/g, function(c) {
        const code = c.charCodeAt(0);
        if (code === 9 || code === 10 || code === 13) return ' ';
        return '';
      });
  }

  compilePdf() {
    // Flush current stream to page array
    if (this.currentOps.length > 0) {
      this.pages.push(this.currentOps.join('\n'));
    }

    const totalPages = this.pages.length;

    // Append footers to each page
    for (let p = 0; p < totalPages; p++) {
      const footerY = this.margin - 16;
      const footerOps = [
        `0.85 0.88 0.92 RG 0.5 w`,
        `${this.margin} ${footerY + 12} m ${this.pageWidth - this.margin} ${footerY + 12} l S`,
        `BT /F1 7.5 Tf 0.5 0.55 0.62 rg`,
        `${this.margin} ${footerY} Td (Generated by ChatNotes   •   100% Client-Side Private Document) Tj ET`
      ];

      if (this.settings.footerStyle !== 'none') {
        const pageStr = `Page ${p + 1} of ${totalPages}`;
        const pageW = this.measureText(pageStr, 7.5);
        footerOps.push(`BT /F1 7.5 Tf 0.5 0.55 0.62 rg`);
        footerOps.push(`${this.pageWidth - this.margin - pageW} ${footerY} Td (${this.escapePdf(pageStr)}) Tj ET`);
      }

      this.pages[p] += '\n' + footerOps.join('\n');
    }

    // Assemble PDF Object Graph
    // 1: Catalog
    // 2: Pages
    // 3.. (Page & Content streams)
    // Fonts: F1..F5
    // Info object
    const objects = [];
    const pageObjNums = [];

    // Object numbering plan:
    // 1: Catalog
    // 2: Pages
    // For each page:
    //   pageObjNum = 3 + (i * 2)
    //   contentObjNum = 3 + (i * 2) + 1
    // After pages:
    //   Font F1
    //   Font F2
    //   Font F3
    //   Font F4
    //   Font F5
    //   Info

    let nextObjNum = 3;
    const contentObjNums = [];
    for (let i = 0; i < totalPages; i++) {
      const pNum = nextObjNum++;
      const cNum = nextObjNum++;
      pageObjNums.push(pNum);
      contentObjNums.push(cNum);
    }

    const f1Num = nextObjNum++;
    const f2Num = nextObjNum++;
    const f3Num = nextObjNum++;
    const f4Num = nextObjNum++;
    const f5Num = nextObjNum++;
    const infoNum = nextObjNum++;

    // 1 0 obj: Catalog
    objects.push({
      num: 1,
      body: `<< /Type /Catalog /Pages 2 0 R >>`
    });

    // 2 0 obj: Pages
    const kidsStr = pageObjNums.map(n => `${n} 0 R`).join(' ');
    objects.push({
      num: 2,
      body: `<< /Type /Pages /Kids [${kidsStr}] /Count ${totalPages} >>`
    });

    // Page and Content objects
    for (let i = 0; i < totalPages; i++) {
      const pNum = pageObjNums[i];
      const cNum = contentObjNums[i];
      const streamData = this.pages[i];
      const streamLen = streamData.length;

      // Page Object
      objects.push({
        num: pNum,
        body: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${this.pageWidth.toFixed(2)} ${this.pageHeight.toFixed(2)}] /Contents ${cNum} 0 R /Resources << /Font << /F1 ${f1Num} 0 R /F2 ${f2Num} 0 R /F3 ${f3Num} 0 R /F4 ${f4Num} 0 R /F5 ${f5Num} 0 R >> >> >>`
      });

      // Content Stream Object
      objects.push({
        num: cNum,
        body: `<< /Length ${streamLen} >>\nstream\n${streamData}\nendstream`
      });
    }

    // Font Objects (Standard 14 PDF Type1 fonts)
    objects.push({
      num: f1Num,
      body: `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`
    });
    objects.push({
      num: f2Num,
      body: `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>`
    });
    objects.push({
      num: f3Num,
      body: `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>`
    });
    objects.push({
      num: f4Num,
      body: `<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>`
    });
    objects.push({
      num: f5Num,
      body: `<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold >>`
    });

    // Info Object
    const dateStrPdf = `D:${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}Z`;
    objects.push({
      num: infoNum,
      body: `<< /Title (${this.escapePdf(this.title)}) /Producer (ChatNotes Chrome Extension) /CreationDate (${dateStrPdf}) >>`
    });

    // Sort objects by num
    objects.sort((a, b) => a.num - b.num);

    // Serialize PDF Output
    let pdfStr = `%PDF-1.4\n%\xE2\xE3\xCF\xD3\n`;
    const offsets = [];

    for (const obj of objects) {
      offsets[obj.num] = pdfStr.length;
      pdfStr += `${obj.num} 0 obj\n${obj.body}\nendobj\n`;
    }

    const startXref = pdfStr.length;
    const totalObjsCount = objects.length + 1;

    pdfStr += `xref\n0 ${totalObjsCount}\n`;
    pdfStr += `0000000000 65535 f \n`;

    for (let i = 1; i <= objects.length; i++) {
      const off = offsets[i] || 0;
      pdfStr += `${String(off).padStart(10, '0')} 00000 n \n`;
    }

    pdfStr += `trailer\n<< /Size ${totalObjsCount} /Root 1 0 R /Info ${infoNum} 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;

    // Convert string to Uint8Array binary buffer
    const buf = new Uint8Array(pdfStr.length);
    for (let i = 0; i < pdfStr.length; i++) {
      buf[i] = pdfStr.charCodeAt(i) & 0xff;
    }
    return buf;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PdfExporter;
}
