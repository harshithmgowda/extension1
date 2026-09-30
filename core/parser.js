/**
 * ChatNotes - Document Parser & Validator
 * Normalizes and validates extracted conversation into canonical Structured Document Model.
 */

const DocumentParser = {
  /**
   * Validate and sanitize raw extracted conversation object
   * @param {object} raw
   * @returns {object} Canonical document model
   */
  normalize(raw) {
    if (!raw || typeof raw !== 'object') {
      throw new Error('Invalid conversation payload: payload must be an object.');
    }

    const title = (raw.title && typeof raw.title === 'string' && raw.title.trim()) 
      ? raw.title.trim() 
      : 'Untitled Notes';

    const rawMessages = Array.isArray(raw.messages) ? raw.messages : [];
    const messages = [];

    let totalWords = 0;
    let codeBlockCount = 0;
    let tableCount = 0;

    rawMessages.forEach((msg, idx) => {
      if (!msg) return;

      const role = (msg.role === 'assistant' || msg.role === 'user') ? msg.role : 'user';
      const content = [];

      const rawContent = Array.isArray(msg.content) ? msg.content : [];
      rawContent.forEach(block => {
        if (!block || !block.type) return;

        switch (block.type) {
          case 'paragraph': {
            const text = String(block.text || '').trim();
            if (text) {
              totalWords += text.split(/\s+/).length;
              content.push({
                type: 'paragraph',
                text,
                links: Array.isArray(block.links) ? block.links : []
              });
            }
            break;
          }
          case 'heading': {
            const level = Math.min(Math.max(parseInt(block.level, 10) || 2, 1), 6);
            const text = String(block.text || '').trim();
            if (text) {
              totalWords += text.split(/\s+/).length;
              content.push({ type: 'heading', level, text });
            }
            break;
          }
          case 'code': {
            const code = String(block.code || '');
            const language = String(block.language || 'text').trim().toLowerCase();
            if (code) {
              codeBlockCount++;
              content.push({ type: 'code', language, code });
            }
            break;
          }
          case 'table': {
            const headers = Array.isArray(block.headers) ? block.headers.map(String) : [];
            const rows = Array.isArray(block.rows) ? block.rows.map(r => Array.isArray(r) ? r.map(String) : []) : [];
            if (headers.length > 0 || rows.length > 0) {
              tableCount++;
              content.push({ type: 'table', headers, rows });
            }
            break;
          }
          case 'list': {
            const items = Array.isArray(block.items) ? block.items : [];
            if (items.length > 0) {
              content.push({
                type: 'list',
                ordered: Boolean(block.ordered),
                items: items.map(item => ({
                  text: String(item.text || '').trim(),
                  subitems: Array.isArray(item.subitems) ? item.subitems : []
                }))
              });
            }
            break;
          }
          case 'quote': {
            const text = String(block.text || '').trim();
            if (text) {
              totalWords += text.split(/\s+/).length;
              content.push({ type: 'quote', text });
            }
            break;
          }
          case 'math': {
            const latex = String(block.latex || '').trim();
            if (latex) {
              content.push({
                type: 'math',
                latex,
                display: Boolean(block.display)
              });
            }
            break;
          }
          case 'image': {
            if (block.src) {
              content.push({
                type: 'image',
                src: String(block.src),
                alt: String(block.alt || 'Illustration')
              });
            }
            break;
          }
          default:
            break;
        }
      });

      if (content.length > 0) {
        messages.push({
          id: msg.id || `msg-${idx + 1}`,
          role,
          content
        });
      }
    });

    return {
      title,
      sourceUrl: raw.url || '',
      createdAt: raw.extractedAt || new Date().toISOString(),
      stats: {
        totalTurns: messages.length,
        totalWords,
        codeBlockCount,
        tableCount,
        estimatedReadTimeMinutes: Math.max(1, Math.ceil(totalWords / 200))
      },
      messages
    };
  }
};

// Export for ES modules and standard script loading
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DocumentParser;
}
