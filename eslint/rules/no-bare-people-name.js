"use strict";

/**
 * ESLint rule: no-bare-people-name (UX-DR49 #1 — decolonial posture)
 *
 * Fires a lint error when a raw people/language name string literal appears
 * OUTSIDE of an `AutonymExonymHeading` component in files under
 * `src/components/people/**` or `src/components/country/**`.
 */

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow bare people/language name strings outside AutonymExonymHeading",
      category: "Decolonial Posture",
      recommended: false,
    },
    schema: [],
    messages: {
      noBarepeopleName:
        "Raw people/language name '{{name}}' must be rendered inside <AutonymExonymHeading> (UX-DR49).",
    },
  },

  create(context) {
    /**
     * Walk up the AST to check whether `node` is a descendant of a JSXElement
     * whose opening element is named `AutonymExonymHeading`.
     */
    function isInsideAutonymExonymHeading(node) {
      let current = node.parent;
      while (current) {
        if (
          current.type === "JSXElement" &&
          current.openingElement &&
          current.openingElement.name &&
          current.openingElement.name.name === "AutonymExonymHeading"
        ) {
          return true;
        }
        current = current.parent;
      }
      return false;
    }

    // Matches at least one capitalised word (proper-noun heuristic).
    // Covers ASCII and common Latin-extended uppercase initials.
    const PROPER_NOUN_RE =
      /[A-ZÀÁÂÄÆÃÅĀÈÉÊËĒĖĘÎÏÍĪĮÌÔÖÒÓŒØŌÕÙÚÛÜŪÑÇ][a-zàáâäæãåāèéêëēėęîïíīįìôöòóœøōõùúûüūñç]+/;

    return {
      JSXText(node) {
        const text = node.value.trim();
        if (!text) return;
        if (!PROPER_NOUN_RE.test(text)) return;
        if (isInsideAutonymExonymHeading(node)) return;

        const match = text.match(PROPER_NOUN_RE);
        context.report({
          node,
          messageId: "noBarepeopleName",
          data: { name: match ? match[0] : text },
        });
      },
    };
  },
};
