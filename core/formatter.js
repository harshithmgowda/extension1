/**
 * ChatNotes - Deterministic Document Formatter
 * Formats structured document model into Exact, Study Notes, or Compact Notes.
 * 100% Deterministic — Never modifies or invents source text.
 */

const DocumentFormatter = {
  /**
   * Format document model according to selected mode
   * @param {object} doc Canonical document model
   * @param {'exact'|'study'|'compact'} mode
   * @returns {object} Formatted presentation tree
   */
  format(doc, mode = 'study') {
    if (!doc || !Array.isArray(doc.messages)) {
      return { title: 'Untitled', sections: [] };
    }

    switch (mode) {
      case 'compact':
        return this.formatCompact(doc);
      case 'exact':
        return this.formatExact(doc);
      case 'study':
      default:
        return this.formatStudy(doc);
    }
  },

  /**
   * EXACT MODE:
   * Keeps exact chronological sequence of User and Assistant turns.
   */
  formatExact(doc) {
    const sections = doc.messages.map((msg, index) => {
      return {
        id: `exact-sec-${index}`,
        type: msg.role === 'user' ? 'user-turn' : 'assistant-turn',
        badge: msg.role === 'user' ? 'User' : 'Assistant',
        blocks: msg.content
      };
    });

    return {
      title: doc.title,
      mode: 'exact',
      meta: doc.stats,
      sections
    };
  },

  /**
   * STUDY NOTES MODE (Deterministic Transformation):
   * Groups questions and explanations into clear pedagogical study blocks.
   * Labels bullet lists as "Key Points", highlights code and tables.
   */
  formatStudy(doc) {
    const sections = [];
    let currentStudyCard = null;

    doc.messages.forEach((msg, idx) => {
      if (msg.role === 'user') {
        // Close previous card if open
        if (currentStudyCard) {
          sections.push(currentStudyCard);
        }

        // Extract main question text
        const questionText = msg.content
          .filter(b => b.type === 'paragraph' || b.type === 'heading')
          .map(b => b.text)
          .join('\n') || 'Discussion Topic';

        currentStudyCard = {
          id: `study-card-${idx}`,
          type: 'study-card',
          question: questionText,
          blocks: []
        };
      } else if (msg.role === 'assistant') {
        // If there was no preceding user prompt, create a default container
        if (!currentStudyCard) {
          currentStudyCard = {
            id: `study-card-${idx}`,
            type: 'study-card',
            question: doc.title || 'Topic Notes',
            blocks: []
          };
        }

        // Process assistant content with deterministic semantic tagging
        msg.content.forEach((block) => {
          if (block.type === 'list') {
            // Promote bullet/numbered lists to Key Points
            currentStudyCard.blocks.push({
              type: 'key-points',
              title: block.ordered ? 'Key Sequence / Steps' : 'Key Takeaways & Points',
              list: block
            });
          } else if (block.type === 'code') {
            // Promote code to Code Implementation
            currentStudyCard.blocks.push({
              type: 'code-highlight',
              title: `Code Implementation (${(block.language || 'Code').toUpperCase()})`,
              codeBlock: block
            });
          } else if (block.type === 'table') {
            // Promote table
            currentStudyCard.blocks.push({
              type: 'table-highlight',
              title: 'Reference Data',
              tableBlock: block
            });
          } else {
            currentStudyCard.blocks.push(block);
          }
        });
      }
    });

    if (currentStudyCard) {
      sections.push(currentStudyCard);
    }

    return {
      title: doc.title,
      mode: 'study',
      meta: doc.stats,
      date: new Date(doc.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      sections
    };
  },

  /**
   * COMPACT MODE:
   * Optimized for minimal page footprint and dense printing.
   */
  formatCompact(doc) {
    const sections = [];

    doc.messages.forEach((msg, idx) => {
      sections.push({
        id: `compact-sec-${idx}`,
        type: 'compact-turn',
        isUser: msg.role === 'user',
        badge: msg.role === 'user' ? 'Q:' : 'A:',
        blocks: msg.content
      });
    });

    return {
      title: doc.title,
      mode: 'compact',
      meta: doc.stats,
      sections
    };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DocumentFormatter;
}
