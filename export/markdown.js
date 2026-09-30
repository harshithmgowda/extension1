/**
 * ChatNotes - Markdown Exporter
 * Generates clean GitHub-Flavored Markdown (GFM) from document model.
 */

const MarkdownExporter = {
  /**
   * Convert document model into Markdown string
   * @param {object} doc Structured document model
   * @param {'exact'|'study'|'compact'} mode
   * @returns {string} Markdown text
   */
  generate(doc, mode = 'study') {
    if (!doc) return '';

    const lines = [];

    // Frontmatter / Title
    lines.push(`# ${doc.title || 'Conversation Notes'}`);
    lines.push('');
    lines.push(`> **Date**: ${new Date(doc.createdAt || Date.now()).toLocaleDateString()}`);
    if (doc.stats) {
      lines.push(`> **Summary**: ${doc.stats.totalTurns || 0} turns · ~${doc.stats.totalWords || 0} words · ${doc.stats.estimatedReadTimeMinutes || 1} min read`);
    }
    lines.push('');
    lines.push('---');
    lines.push('');

    const messages = Array.isArray(doc.messages) ? doc.messages : [];

    messages.forEach((msg, idx) => {
      const isUser = msg.role === 'user';

      if (mode === 'study') {
        if (isUser) {
          lines.push(`## Prompt`);
          lines.push('');
        } else {
          lines.push(`## Explanation`);
          lines.push('');
        }
      } else if (mode === 'exact') {
        lines.push(`### ${isUser ? 'User' : 'Assistant'}`);
        lines.push('');
      } else if (mode === 'compact') {
        lines.push(`**[${isUser ? 'Q' : 'A'}]**`);
      }

      const content = Array.isArray(msg.content) ? msg.content : [];
      content.forEach(block => {
        lines.push(this.renderBlock(block, mode));
        lines.push('');
      });

      lines.push('---');
      lines.push('');
    });

    return lines.join('\n').trim() + '\n';
  },

  /**
   * Render individual content block into markdown
   * @param {object} block
   * @returns {string}
   */
  renderBlock(block) {
    if (!block || !block.type) return '';

    switch (block.type) {
      case 'paragraph': {
        return block.text || '';
      }
      case 'heading': {
        const hashes = '#'.repeat(Math.min(Math.max(block.level || 2, 1), 6));
        return `${hashes} ${block.text || ''}`;
      }
      case 'code':
      case 'code-highlight': {
        const c = block.codeBlock || block;
        const lang = c.language || '';
        return `\`\`\`${lang}\n${c.code || ''}\n\`\`\``;
      }
      case 'key-points': {
        const lines = [`### ${block.title || 'Key Points'}`];
        if (block.list) {
          lines.push(this.renderList(block.list));
        }
        return lines.join('\n\n');
      }
      case 'list': {
        return this.renderList(block);
      }
      case 'table':
      case 'table-highlight': {
        const t = block.tableBlock || block;
        return this.renderTable(t);
      }
      case 'quote': {
        return `> ${block.text || ''}`;
      }
      case 'math': {
        return block.display ? `$$\n${block.latex}\n$$` : `$${block.latex}$`;
      }
      case 'image': {
        return `![${block.alt || 'Image'}](${block.src || ''})`;
      }
      default:
        return block.text || '';
    }
  },

  /**
   * Render markdown list with indentation support
   */
  renderList(listBlock, indentLevel = 0) {
    const lines = [];
    const indent = '  '.repeat(indentLevel);
    const isOrdered = Boolean(listBlock.ordered);

    const items = Array.isArray(listBlock.items) ? listBlock.items : [];
    items.forEach((item, index) => {
      const bullet = isOrdered ? `${index + 1}.` : '-';
      lines.push(`${indent}${bullet} ${item.text || ''}`);

      if (item.subitems && item.subitems.length > 0) {
        lines.push(this.renderList({ ordered: isOrdered, items: item.subitems }, indentLevel + 1));
      }
    });

    return lines.join('\n');
  },

  /**
   * Render markdown table
   */
  renderTable(tableBlock) {
    const headers = Array.isArray(tableBlock.headers) ? tableBlock.headers : [];
    const rows = Array.isArray(tableBlock.rows) ? tableBlock.rows : [];

    if (headers.length === 0 && rows.length === 0) return '';

    const lines = [];
    
    // Header row
    if (headers.length > 0) {
      lines.push('| ' + headers.join(' | ') + ' |');
      lines.push('| ' + headers.map(() => '---').join(' | ') + ' |');
    }

    // Body rows
    rows.forEach(row => {
      lines.push('| ' + row.join(' | ') + ' |');
    });

    return lines.join('\n');
  },

  /**
   * Trigger local browser file download
   * @param {string} content
   * @param {string} filename
   */
  download(content, filename = 'notes.md') {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
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
  module.exports = MarkdownExporter;
}
