/**
 * ChatNotes - Storage Controller
 * Async interface for persisting user preferences and conversation cache.
 */

const StorageManager = {
  DEFAULT_SETTINGS: {
    template: 'academic',
    font: 'Inter',
    fontSize: 14,
    accentColor: '#4f46e5',
    textColor: '#1e293b',
    bgColor: '#ffffff',
    headingColor: '#0f172a',
    borderStyle: 'simple',
    pageSize: 'A4',
    orientation: 'portrait',
    margins: 'normal',
    headerStyle: 'title',
    footerStyle: 'page-numbers',
    exportMode: 'study'
  },

  /**
   * Safe check for chrome.storage.local availability
   */
  _hasChromeStorage() {
    return typeof chrome !== 'undefined' && Boolean(chrome.storage && chrome.storage.local);
  },

  /**
   * Get user customization settings
   * @returns {Promise<object>}
   */
  async getSettings() {
    if (this._hasChromeStorage()) {
      return new Promise((resolve) => {
        chrome.storage.local.get('settings', (result) => {
          resolve(Object.assign({}, this.DEFAULT_SETTINGS, (result && result.settings) || {}));
        });
      });
    }

    try {
      const raw = localStorage.getItem('chatnotes_settings');
      const parsed = raw ? JSON.parse(raw) : {};
      return Object.assign({}, this.DEFAULT_SETTINGS, parsed);
    } catch {
      return Object.assign({}, this.DEFAULT_SETTINGS);
    }
  },

  /**
   * Save user customization settings
   * @param {object} newSettings
   * @returns {Promise<object>}
   */
  async saveSettings(newSettings) {
    const current = await this.getSettings();
    const updated = Object.assign({}, current, newSettings);

    if (this._hasChromeStorage()) {
      return new Promise((resolve) => {
        chrome.storage.local.set({ settings: updated }, () => resolve(updated));
      });
    }

    try {
      localStorage.setItem('chatnotes_settings', JSON.stringify(updated));
    } catch (e) {
      console.warn('[ChatNotes] localStorage write error:', e);
    }
    return updated;
  },

  /**
   * Get currently active conversation document
   * @returns {Promise<object|null>}
   */
  async getActiveDocument() {
    if (this._hasChromeStorage()) {
      return new Promise((resolve) => {
        chrome.storage.local.get('active_document', (result) => {
          resolve((result && result.active_document) || null);
        });
      });
    }

    try {
      const raw = localStorage.getItem('chatnotes_active_doc');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  /**
   * Cache active conversation document
   * @param {object} doc
   * @returns {Promise<void>}
   */
  async saveActiveDocument(doc) {
    if (this._hasChromeStorage()) {
      return new Promise((resolve) => {
        chrome.storage.local.set({ active_document: doc }, () => resolve());
      });
    }

    try {
      localStorage.setItem('chatnotes_active_doc', JSON.stringify(doc));
    } catch (e) {
      console.warn('[ChatNotes] localStorage write error:', e);
    }
  },

  /**
   * Clear cached document
   * @returns {Promise<void>}
   */
  async clearActiveDocument() {
    if (this._hasChromeStorage()) {
      return new Promise((resolve) => {
        chrome.storage.local.remove('active_document', () => resolve());
      });
    }

    try {
      localStorage.removeItem('chatnotes_active_doc');
    } catch (e) {
      console.warn('[ChatNotes] localStorage remove error:', e);
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageManager;
}
