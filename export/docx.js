/**
 * ChatNotes - DOCX Exporter
 * Generates valid, native Microsoft Word (.docx / OpenXML) files in pure client-side JS.
 * Zero external server, zero cloud APIs, opens directly in Microsoft Word, Google Docs, and LibreOffice.
 */

const DocxExporter = {
  /**
   * Generates and downloads native .docx file from document model
   * @param {object} doc Structured document model
   * @param {'exact'|'study'|'compact'} mode
   * @param {string} filename
   * @param {object} settings Customization settings
   */
  download(doc, mode = 'study', filename = 'notes.docx', settings = {}) {
    const xmlContent = this.generateDocumentXml(doc, mode, settings);
    const zipBlob = this.buildDocxZip(xmlContent, doc.title || 'ChatNotes Document', settings);

    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  },

  /**
   * Escape XML entities and remove invalid XML control characters
   */
  escapeXml(str) {
    return String(str || '')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  },

  /**
   * Generates word/document.xml content
   */
  generateDocumentXml(doc, mode = 'study', settings = {}) {
    const title = this.escapeXml(doc.title || 'Conversation Notes');
    const docFont = settings.font || 'Calibri';
    const accentHex = (settings.accentColor || '#0071e3').replace('#', '').toUpperCase();
    const bodyXml = [];

    // Title paragraph
    bodyXml.push(`
      <w:p>
        <w:pPr>
          <w:jc w:val="center"/>
          <w:spacing w:before="240" w:after="160"/>
        </w:pPr>
        <w:r>
          <w:rPr>
            <w:rFonts w:ascii="${docFont}" w:hAnsi="${docFont}"/>
            <w:b/>
            <w:color w:val="${accentHex}"/>
            <w:sz w:val="48"/>
          </w:rPr>
          <w:t>${title}</w:t>
        </w:r>
      </w:p>
    `);

    // Meta subtext (note: using unicode \u2022 instead of HTML &bull;)
    bodyXml.push(`
      <w:p>
        <w:pPr>
          <w:jc w:val="center"/>
          <w:spacing w:after="360"/>
        </w:pPr>
        <w:r>
          <w:rPr>
            <w:rFonts w:ascii="${docFont}" w:hAnsi="${docFont}"/>
            <w:i/>
            <w:color w:val="64748B"/>
            <w:sz w:val="20"/>
          </w:rPr>
          <w:t>Exported via ChatNotes • ${new Date(doc.createdAt || Date.now()).toLocaleDateString()}</w:t>
        </w:r>
      </w:p>
    `);

    const messages = Array.isArray(doc.messages) ? doc.messages : [];

    messages.forEach((msg, mIdx) => {
      const isUser = msg.role === 'user';

      if (mode === 'study') {
        if (isUser) {
          // Question header
          bodyXml.push(`
            <w:p>
              <w:pPr>
                <w:pBdr>
                  <w:left w:val="single" w:sz="24" w:space="8" w:color="${accentHex}"/>
                </w:pBdr>
                <w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/>
                <w:spacing w:before="240" w:after="120"/>
              </w:pPr>
              <w:r>
                <w:rPr>
                  <w:rFonts w:ascii="${docFont}" w:hAnsi="${docFont}"/>
                  <w:b/>
                  <w:color w:val="${accentHex}"/>
                  <w:sz w:val="26"/>
                </w:rPr>
                <w:t xml:space="preserve">Prompt</w:t>
              </w:r>
            </w:p>
          `);
        } else {
          bodyXml.push(`
            <w:p>
              <w:pPr>
                <w:spacing w:before="240" w:after="120"/>
              </w:pPr>
              <w:r>
                <w:rPr>
                  <w:rFonts w:ascii="${docFont}" w:hAnsi="${docFont}"/>
                  <w:b/>
                  <w:color w:val="0F172A"/>
                  <w:sz w:val="28"/>
                </w:rPr>
                <w:t xml:space="preserve">Explanation</w:t>
              </w:r>
            </w:p>
          `);
        }
      } else {
        bodyXml.push(`
          <w:p>
            <w:pPr><w:spacing w:before="180" w:after="100"/></w:pPr>
            <w:r>
              <w:rPr>
                <w:rFonts w:ascii="${docFont}" w:hAnsi="${docFont}"/>
                <w:b/>
                <w:sz w:val="24"/>
                <w:color w:val="${isUser ? accentHex : '10B981'}"/>
              </w:rPr>
              <w:t>${isUser ? 'User' : 'Assistant'}:</w:t>
            </w:r>
          </w:p>
        `);
      }

      const content = Array.isArray(msg.content) ? msg.content : [];
      content.forEach(block => {
        switch (block.type) {
          case 'paragraph': {
            bodyXml.push(`
              <w:p>
                <w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr>
                <w:r>
                  <w:rPr>
                    <w:rFonts w:ascii="${docFont}" w:hAnsi="${docFont}"/>
                    <w:sz w:val="22"/>
                    <w:color w:val="1E293B"/>
                  </w:rPr>
                  <w:t xml:space="preserve">${this.escapeXml(block.text)}</w:t>
                </w:r>
              </w:p>
            `);
            break;
          }
          case 'heading': {
            const sz = block.level === 1 ? '32' : block.level === 2 ? '28' : '24';
            bodyXml.push(`
              <w:p>
                <w:pPr><w:spacing w:before="200" w:after="100"/></w:pPr>
                <w:r>
                  <w:rPr>
                    <w:rFonts w:ascii="${docFont}" w:hAnsi="${docFont}"/>
                    <w:b/>
                    <w:sz w:val="${sz}"/>
                    <w:color w:val="0F172A"/>
                  </w:rPr>
                  <w:t xml:space="preserve">${this.escapeXml(block.text)}</w:t>
                </w:r>
              </w:p>
            `);
            break;
          }
          case 'code':
          case 'code-highlight': {
            const c = block.codeBlock || block;
            const lines = (c.code || '').split('\n');
            const lang = (c.language || 'Code').toUpperCase();

            // Xcode style header bar in Word
            bodyXml.push(`
              <w:p>
                <w:pPr>
                  <w:pBdr>
                    <w:top w:val="single" w:sz="6" w:space="4" w:color="CBD5E1"/>
                    <w:left w:val="single" w:sz="18" w:space="6" w:color="${accentHex}"/>
                    <w:right w:val="single" w:sz="6" w:space="4" w:color="CBD5E1"/>
                  </w:pBdr>
                  <w:shd w:val="clear" w:color="auto" w:fill="E2E8F0"/>
                  <w:spacing w:before="160" w:after="40"/>
                </w:pPr>
                <w:r>
                  <w:rPr>
                    <w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/>
                    <w:b/>
                    <w:color w:val="475569"/>
                    <w:sz w:val="18"/>
                  </w:rPr>
                  <w:t> Xcode [ ${this.escapeXml(lang)} ]</w:t>
                </w:r>
              </w:p>
            `);

            // Code lines inside shaded box
            lines.forEach((line, lineIdx) => {
              const lineNum = String(lineIdx + 1).padStart(2, ' ');
              bodyXml.push(`
                <w:p>
                  <w:pPr>
                    <w:pBdr>
                      <w:left w:val="single" w:sz="18" w:space="6" w:color="${accentHex}"/>
                      <w:right w:val="single" w:sz="6" w:space="4" w:color="CBD5E1"/>
                      ${lineIdx === lines.length - 1 ? `<w:bottom w:val="single" w:sz="6" w:space="4" w:color="CBD5E1"/>` : ''}
                    </w:pBdr>
                    <w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/>
                    <w:spacing w:after="0" w:line="220" w:lineRule="auto"/>
                  </w:pPr>
                  <w:r>
                    <w:rPr>
                      <w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/>
                      <w:sz w:val="18"/>
                      <w:color w:val="94A3B8"/>
                    </w:rPr>
                    <w:t xml:space="preserve">${lineNum} | </w:t>
                  </w:r>
                  <w:r>
                    <w:rPr>
                      <w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/>
                      <w:sz w:val="19"/>
                      <w:color w:val="1E293B"/>
                    </w:rPr>
                    <w:t xml:space="preserve">${this.escapeXml(line)}</w:t>
                  </w:r>
                </w:p>
              `);
            });
            bodyXml.push(`<w:p><w:pPr><w:spacing w:after="140"/></w:pPr></w:p>`);
            break;
          }
          case 'list': {
            const items = Array.isArray(block.items) ? block.items : [];
            items.forEach((item, i) => {
              const prefix = block.ordered ? `${i + 1}. ` : `• `;
              bodyXml.push(`
                <w:p>
                  <w:pPr>
                    <w:ind w:left="420" w:hanging="240"/>
                    <w:spacing w:after="80"/>
                  </w:pPr>
                  <w:r>
                    <w:rPr>
                      <w:rFonts w:ascii="${docFont}" w:hAnsi="${docFont}"/>
                      <w:b/>
                      <w:color w:val="${accentHex}"/>
                    </w:rPr>
                    <w:t>${prefix}</w:t>
                  </w:r>
                  <w:r>
                    <w:rPr>
                      <w:rFonts w:ascii="${docFont}" w:hAnsi="${docFont}"/>
                      <w:sz w:val="22"/>
                      <w:color w:val="1E293B"/>
                    </w:rPr>
                    <w:t xml:space="preserve">${this.escapeXml(item.text)}</w:t>
                  </w:r>
                </w:p>
              `);
            });
            break;
          }
          case 'key-points': {
            bodyXml.push(`
              <w:p>
                <w:pPr>
                  <w:pBdr>
                    <w:left w:val="single" w:sz="20" w:space="6" w:color="${accentHex}"/>
                  </w:pBdr>
                  <w:shd w:val="clear" w:color="auto" w:fill="F0F9FF"/>
                  <w:spacing w:before="140" w:after="60"/>
                </w:pPr>
                <w:r>
                  <w:rPr>
                    <w:rFonts w:ascii="${docFont}" w:hAnsi="${docFont}"/>
                    <w:b/>
                    <w:color w:val="${accentHex}"/>
                    <w:sz w:val="22"/>
                  </w:rPr>
                  <w:t>${this.escapeXml(block.title || 'Key Points')}</w:t>
                </w:r>
              </w:p>
            `);
            const lItems = (block.list && Array.isArray(block.list.items)) ? block.list.items : [];
            lItems.forEach((it, idx) => {
              bodyXml.push(`
                <w:p>
                  <w:pPr>
                    <w:pBdr>
                      <w:left w:val="single" w:sz="20" w:space="6" w:color="${accentHex}"/>
                    </w:pBdr>
                    <w:shd w:val="clear" w:color="auto" w:fill="F0F9FF"/>
                    <w:ind w:left="420" w:hanging="240"/>
                    <w:spacing w:after="60"/>
                  </w:pPr>
                  <w:r>
                    <w:rPr><w:b/><w:color w:val="${accentHex}"/></w:rPr>
                    <w:t>• </w:t>
                  </w:r>
                  <w:r>
                    <w:rPr>
                      <w:rFonts w:ascii="${docFont}" w:hAnsi="${docFont}"/>
                      <w:sz w:val="22"/>
                      <w:color w:val="1E293B"/>
                    </w:rPr>
                    <w:t xml:space="preserve">${this.escapeXml(it.text)}</w:t>
                  </w:r>
                </w:p>
              `);
            });
            break;
          }
          case 'quote': {
            bodyXml.push(`
              <w:p>
                <w:pPr>
                  <w:pBdr>
                    <w:left w:val="single" w:sz="24" w:space="8" w:color="94A3B8"/>
                  </w:pBdr>
                  <w:ind w:left="360"/>
                  <w:spacing w:before="120" w:after="120"/>
                </w:pPr>
                <w:r>
                  <w:rPr>
                    <w:rFonts w:ascii="${docFont}" w:hAnsi="${docFont}"/>
                    <w:i/>
                    <w:sz w:val="22"/>
                    <w:color w:val="475569"/>
                  </w:rPr>
                  <w:t xml:space="preserve">${this.escapeXml(block.text)}</w:t>
                </w:r>
              </w:p>
            `);
            break;
          }
          case 'table':
          case 'table-highlight': {
            const tbl = block.tableBlock || block;
            const headers = Array.isArray(tbl.headers) ? tbl.headers : [];
            const rows = Array.isArray(tbl.rows) ? tbl.rows : [];
            const colCount = Math.max(headers.length, rows.length > 0 ? rows[0].length : 1);
            const colWidth = Math.floor(9000 / colCount);

            bodyXml.push(`
              <w:tbl>
                <w:tblPr>
                  <w:tblW w:w="5000" w:type="pct"/>
                  <w:tblBorders>
                    <w:top w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
                    <w:left w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
                    <w:bottom w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
                    <w:right w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
                    <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
                    <w:insideV w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
                  </w:tblBorders>
                </w:tblPr>
                <w:tblGrid>
                  ${Array(colCount).fill(`<w:gridCol w:w="${colWidth}"/>`).join('')}
                </w:tblGrid>
            `);
            if (headers.length > 0) {
              bodyXml.push('<w:tr>');
              headers.forEach(h => {
                bodyXml.push(`
                  <w:tc>
                    <w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/></w:tcPr>
                    <w:p><w:r><w:rPr><w:rFonts w:ascii="${docFont}" w:hAnsi="${docFont}"/><w:b/><w:sz w:val="20"/><w:color w:val="0F172A"/></w:rPr><w:t>${this.escapeXml(h)}</w:t></w:r></w:p>
                  </w:tc>
                `);
              });
              bodyXml.push('</w:tr>');
            }
            rows.forEach(r => {
              bodyXml.push('<w:tr>');
              r.forEach(c => {
                bodyXml.push(`
                  <w:tc>
                    <w:p><w:r><w:rPr><w:rFonts w:ascii="${docFont}" w:hAnsi="${docFont}"/><w:sz w:val="20"/><w:color w:val="334155"/></w:rPr><w:t>${this.escapeXml(c)}</w:t></w:r></w:p>
                  </w:tc>
                `);
              });
              bodyXml.push('</w:tr>');
            });
            bodyXml.push('</w:tbl>');
            bodyXml.push('<w:p><w:pPr><w:spacing w:after="160"/></w:pPr></w:p>');
            break;
          }
          default:
            break;
        }
      });
    });

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${bodyXml.join('')}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>`;
  },

  /**
   * Pure JS ZIP file builder (Stores standard files with 0 external dependencies)
   */
  buildDocxZip(documentXml, title, settings = {}) {
    const encoder = new TextEncoder();
    const docFont = settings.font || 'Calibri';

    const files = [
      {
        name: '[Content_Types].xml',
        data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`)
      },
      {
        name: '_rels/.rels',
        data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`)
      },
      {
        name: 'word/_rels/document.xml.rels',
        data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`)
      },
      {
        name: 'word/styles.xml',
        data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="${docFont}" w:hAnsi="${docFont}" w:cs="${docFont}"/>
        <w:sz w:val="22"/>
        <w:lang w:val="en-US"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
</w:styles>`)
      },
      {
        name: 'word/document.xml',
        data: encoder.encode(documentXml)
      }
    ];

    // Compute CRC32 table
    const crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
      crcTable[n] = c;
    }

    function crc32(buf) {
      let crc = 0 ^ (-1);
      for (let i = 0; i < buf.length; i++) {
        crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
      }
      return (crc ^ (-1)) >>> 0;
    }

    const parts = [];
    let offset = 0;
    const centralEntries = [];

    // Local file entries
    files.forEach(f => {
      const nameBuf = encoder.encode(f.name);
      const dataBuf = f.data;
      const crc = crc32(dataBuf);
      const size = dataBuf.length;

      // Local Header (30 bytes + name)
      const localHeader = new Uint8Array(30 + nameBuf.length);
      const view = new DataView(localHeader.buffer);
      view.setUint32(0, 0x04034b50, true); // signature
      view.setUint16(4, 20, true);         // version needed
      view.setUint16(6, 0, true);          // flags
      view.setUint16(8, 0, true);          // compression (0 = stored)
      view.setUint16(10, 0, true);         // mod time
      view.setUint16(12, 0, true);         // mod date
      view.setUint32(14, crc, true);       // crc32
      view.setUint32(18, size, true);      // compressed size
      view.setUint32(22, size, true);      // uncompressed size
      view.setUint16(26, nameBuf.length, true);
      view.setUint16(28, 0, true);         // extra len
      localHeader.set(nameBuf, 30);

      parts.push(localHeader);
      parts.push(dataBuf);

      // Central Directory Header
      const cdHeader = new Uint8Array(46 + nameBuf.length);
      const cdView = new DataView(cdHeader.buffer);
      cdView.setUint32(0, 0x02014b50, true); // signature
      cdView.setUint16(4, 20, true);
      cdView.setUint16(6, 20, true);
      cdView.setUint16(8, 0, true);
      cdView.setUint16(10, 0, true);         // compression = 0
      cdView.setUint16(12, 0, true);
      cdView.setUint16(14, 0, true);
      cdView.setUint32(16, crc, true);
      cdView.setUint32(20, size, true);
      cdView.setUint32(24, size, true);
      cdView.setUint16(28, nameBuf.length, true);
      cdView.setUint16(30, 0, true);
      cdView.setUint16(32, 0, true);
      cdView.setUint16(34, 0, true);
      cdView.setUint16(36, 0, true);
      cdView.setUint32(38, 0, true);
      cdView.setUint32(42, offset, true);    // local header offset
      cdHeader.set(nameBuf, 46);

      centralEntries.push(cdHeader);
      offset += localHeader.length + dataBuf.length;
    });

    const centralStart = offset;
    let centralSize = 0;
    centralEntries.forEach(cd => {
      parts.push(cd);
      centralSize += cd.length;
    });

    // End of Central Directory
    const eocd = new Uint8Array(22);
    const eocdView = new DataView(eocd.buffer);
    eocdView.setUint32(0, 0x06054b50, true);
    eocdView.setUint16(4, 0, true);
    eocdView.setUint16(6, 0, true);
    eocdView.setUint16(8, files.length, true);
    eocdView.setUint16(10, files.length, true);
    eocdView.setUint32(12, centralSize, true);
    eocdView.setUint32(16, centralStart, true);
    eocdView.setUint16(20, 0, true);
    parts.push(eocd);

    return new Blob(parts, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DocxExporter;
}
