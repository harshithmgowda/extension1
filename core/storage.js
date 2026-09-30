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
   * Get user customization settings
   * @returns {Promise<object>}
   */
  async getSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get('settings', (result) => {
        resolve(Object.assign({}, this.DEFAULT_SETTINGS, result.settings || {}));
      });
    });
  },

  /**
   * Save user customization settings
   * @param {object} newSettings
   * @returns {Promise<void>}
   */
  async saveSettings(newSettings) {
    const current = await this.getSettings();
    const updated = Object.assign({}, current, newSettings);
    return new Promise((resolve) => {
      chrome.storage.local.set({ settings: updated }, () => resolve(updated));
    });
  },

  /**
   * Get currently active conversation document
   * @returns {Promise<object|null>}
   */
  async getActiveDocument() {
    return new Promise((resolve) => {
      chrome.storage.local.get('active_document', (result) => {
        resolve(result.active_document || null);
      });
    });
  },

  /**
   * Cache active conversation document
   * @param {object} doc
   * @returns {Promise<void>}
   */
  async saveActiveDocument(doc) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ active_document: doc }, () => resolve());
    });
  },

  /**
   * Clear cached document
   * @returns {Promise<void>}
   */
  async clearActiveDocument() {
    return new Promise((resolve) => {
      chrome.storage.local.remove('active_document', () => resolve());
    });
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageManager;
}
