/**
 * ChatNotes - Xcode Syntax Highlighter & Code Block Engine
 * Renders authentic Apple Xcode Playground / Code Editor style code blocks:
 * macOS window traffic lights, language badge, line-number gutter, Copy button,
 * and high-fidelity Xcode syntax highlighting.
 */

const XcodeHighlighter = {
  // Common keyword dictionaries
  KEYWORDS: {
    python: new Set([
      'def', 'class', 'return', 'if', 'elif', 'else', 'while', 'for', 'in',
      'try', 'except', 'finally', 'with', 'as', 'import', 'from', 'lambda',
      'yield', 'break', 'continue', 'pass', 'raise', 'global', 'nonlocal',
      'assert', 'async', 'await', 'del', 'not', 'and', 'or', 'is'
    ]),
    javascript: new Set([
      'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case',
      'break', 'continue', 'const', 'let', 'var', 'class', 'extends', 'new', 'this',
      'super', 'import', 'export', 'default', 'from', 'try', 'catch', 'finally',
      'throw', 'async', 'await', 'typeof', 'instanceof', 'void', 'delete', 'yield',
      'in', 'of'
    ]),
    sql: new Set([
      'select', 'from', 'where', 'insert', 'into', 'values', 'update', 'set',
      'delete', 'join', 'inner', 'left', 'right', 'outer', 'on', 'group', 'by',
      'order', 'having', 'limit', 'offset', 'create', 'table', 'drop', 'alter',
      'primary', 'key', 'foreign', 'distinct', 'union', 'all', 'as', 'case',
      'when', 'then', 'end', 'and', 'or', 'not', 'is', 'null', 'like', 'in'
    ]),
    html: new Set([
      'DOCTYPE', 'html', 'head', 'body', 'div', 'span', 'h1', 'h2', 'h3', 'h4',
      'p', 'a', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'thead', 'tbody',
      'form', 'input', 'button', 'header', 'footer', 'nav', 'section', 'article',
      'script', 'style', 'link', 'meta'
    ]),
    cpp: new Set([
      'auto', 'break', 'case', 'char', 'const', 'continue', 'default', 'do',
      'double', 'else', 'enum', 'extern', 'float', 'for', 'goto', 'if', 'int',
      'long', 'register', 'return', 'short', 'signed', 'sizeof', 'static',
      'struct', 'switch', 'typedef', 'union', 'unsigned', 'void', 'volatile',
      'while', 'class', 'namespace', 'using', 'public', 'private', 'protected',
      'template', 'typename', 'virtual', 'override', 'constexpr', 'nullptr'
    ]),
    swift: new Set([
      'func', 'var', 'let', 'class', 'struct', 'enum', 'protocol', 'extension',
      'if', 'else', 'guard', 'switch', 'case', 'default', 'for', 'in', 'while',
      'repeat', 'return', 'break', 'continue', 'throw', 'throws', 'rethrows',
      'try', 'catch', 'import', 'public', 'private', 'fileprivate', 'internal',
      'open', 'static', 'mutating', 'override', 'init', 'self', 'Self', 'nil',
      'async', 'await', 'actor'
    ])
  },

  BUILTINS: new Set([
    'print', 'len', 'range', 'enumerate', 'zip', 'map', 'filter', 'sum', 'min',
    'max', 'abs', 'round', 'all', 'any', 'isinstance', 'issubclass', 'id',
    'console', 'window', 'document', 'Math', 'JSON', 'Object', 'Array', 'String',
    'Number', 'Boolean', 'Date', 'RegExp', 'Promise', 'Set', 'Map', 'Error',
    'parseInt', 'parseFloat', 'setTimeout', 'setInterval', 'fetch'
  ]),

  LITERALS: new Set([
    'true', 'false', 'null', 'undefined', 'NaN', 'Infinity',
    'True', 'False', 'None', 'nil', 'nullptr'
  ]),

  /**
   * Escape HTML entities
   */
  escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  /**
   * Tokenize and highlight a single line of code
   */
  highlightLine(line, lang) {
    if (!line) return '&nbsp;';

    const normalizedLang = (lang || 'python').toLowerCase();
    const keywords = this.KEYWORDS[normalizedLang] || this.KEYWORDS.javascript;

    let result = '';
    let i = 0;
    const len = line.length;

    while (i < len) {
      // 1. Comments
      if (
        (normalizedLang === 'python' && line[i] === '#') ||
        (line[i] === '/' && line[i + 1] === '/') ||
        (normalizedLang === 'sql' && line[i] === '-' && line[i + 1] === '-')
      ) {
        result += `<span class="xcode-comment">${this.escapeHtml(line.slice(i))}</span>`;
        break;
      }

      // 2. Strings (single, double quote, backtick)
      if (line[i] === '"' || line[i] === "'" || line[i] === '`') {
        const quote = line[i];
        let strVal = quote;
        i++;
        while (i < len) {
          if (line[i] === '\\') {
            strVal += line[i] + (line[i + 1] || '');
            i += 2;
            continue;
          }
          strVal += line[i];
          if (line[i] === quote) {
            i++;
            break;
          }
          i++;
        }
        result += `<span class="xcode-str">${this.escapeHtml(strVal)}</span>`;
        continue;
      }

      // 3. Numbers
      if (/\d/.test(line[i]) && (i === 0 || /[\s,([+\-*/%=<>&|!~:;]/.test(line[i - 1]))) {
        let numVal = '';
        while (i < len && /[0-9a-fA-FxX.eE_]/.test(line[i])) {
          numVal += line[i];
          i++;
        }
        result += `<span class="xcode-num">${this.escapeHtml(numVal)}</span>`;
        continue;
      }

      // 4. Identifiers / Words
      if (/[a-zA-Z_$]/.test(line[i])) {
        let word = '';
        while (i < len && /[a-zA-Z0-9_$]/.test(line[i])) {
          word += line[i];
          i++;
        }

        // Check next char for function call
        let isFuncCall = false;
        let peek = i;
        while (peek < len && /\s/.test(line[peek])) peek++;
        if (peek < len && line[peek] === '(') {
          isFuncCall = true;
        }

        if (keywords.has(word) || keywords.has(word.toLowerCase())) {
          result += `<span class="xcode-kw">${this.escapeHtml(word)}</span>`;
        } else if (this.LITERALS.has(word)) {
          result += `<span class="xcode-lit">${this.escapeHtml(word)}</span>`;
        } else if (this.BUILTINS.has(word)) {
          result += `<span class="xcode-builtin">${this.escapeHtml(word)}</span>`;
        } else if (isFuncCall) {
          result += `<span class="xcode-func">${this.escapeHtml(word)}</span>`;
        } else if (/^[A-Z][a-zA-Z0-9_]*$/.test(word)) {
          // Class / Type convention
          result += `<span class="xcode-type">${this.escapeHtml(word)}</span>`;
        } else {
          result += this.escapeHtml(word);
        }
        continue;
      }

      // 5. Operators & punctuation
      if (/[+\-*/%=<>!&|^~?:]/.test(line[i])) {
        result += `<span class="xcode-op">${this.escapeHtml(line[i])}</span>`;
        i++;
        continue;
      }

      // 6. Regular characters
      result += this.escapeHtml(line[i]);
      i++;
    }

    return result;
  },

  /**
   * Render full Xcode playground / editor window markup
   * @param {string} code Raw code content
   * @param {string} language Language identifier
   * @param {boolean} isDark Whether to apply Xcode dark theme
   * @returns {string} HTML markup
   */
  renderXcodeBlock(code, language = 'python', isDark = false) {
    const rawLines = String(code || '').split('\n');
    const lang = (language || 'code').toLowerCase();
    const darkClass = isDark ? ' xcode-dark' : '';

    const lineCount = rawLines.length;
    const gutterHtml = Array.from({ length: lineCount }, (_, idx) => `<span class="gutter-num">${idx + 1}</span>`).join('');
    
    const highlightedLines = rawLines.map(line => {
      return `<div class="xcode-line">${this.highlightLine(line, lang)}</div>`;
    }).join('');

    // Safe base64 / encoded code for data attribute copy
    const encoded = encodeURIComponent(code);

    return `
      <div class="xcode-window${darkClass}">
        <div class="xcode-header">
          <div class="xcode-controls">
            <span class="xcode-dot close"></span>
            <span class="xcode-dot minimize"></span>
            <span class="xcode-dot zoom"></span>
          </div>
          <div class="xcode-title">
            <span class="xcode-lang-badge">${this.escapeHtml(lang.toUpperCase())}</span>
          </div>
          <div class="xcode-actions">
            <button type="button" class="xcode-copy-btn" data-code="${encoded}" title="Copy code">
              <svg class="copy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <span class="copy-text">Copy</span>
            </button>
          </div>
        </div>
        <div class="xcode-content">
          <div class="xcode-gutter" aria-hidden="true">${gutterHtml}</div>
          <pre class="xcode-code"><code class="language-${this.escapeHtml(lang)}">${highlightedLines}</code></pre>
        </div>
      </div>
    `;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = XcodeHighlighter;
}
