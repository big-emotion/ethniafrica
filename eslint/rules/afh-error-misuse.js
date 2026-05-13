/**
 * ETNI-21 / UX-DR49 rule 3 — `--afh-error` misuse detector.
 *
 * The `--afh-error` token (and its `--afh-error-bg` / `--afh-error-border`
 * companions) is reserved for components dedicated to error / invalid /
 * broken-state UI. Sprinkling error red elsewhere creates ambiguous
 * affordances and undermines the warning vocabulary of the design system.
 *
 * Heuristic: a component file may reference `--afh-error*` only when its
 * filename or default export identifier contains "Error", "Invalid", or
 * "Broken" (case-insensitive). Otherwise the reference is flagged.
 *
 * Scope: applied to source files under `src/components/` and `src/app/`
 * (configured in the top-level `eslint.config.mjs`). Storybook files
 * (`*.stories.*`, `*.mdx`) and test files are exempt.
 *
 * The rule walks every string literal and template literal in the AST,
 * which is sufficient for JSX `style={{ color: "var(--afh-error)" }}`,
 * inline strings, and `cn("text-afh-error", ...)` style usage. Token
 * references inside `.css` files are intentionally out of scope —
 * CSS files are not parsed by ESLint here.
 */

"use strict";

const ALLOWED_NAME_TOKENS = ["error", "invalid", "broken"];
const ERROR_TOKEN_RE = /--afh-error\b/;
const TAILWIND_ERROR_RE =
  /\b(?:bg|text|border|ring|shadow|fill|stroke|outline)-afh-error\b/;

/**
 * @param {string} filename
 * @returns {boolean}
 */
function filenameImpliesErrorContext(filename) {
  if (!filename) return false;
  const lower = filename.toLowerCase();
  return ALLOWED_NAME_TOKENS.some((needle) => lower.includes(needle));
}

/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow `--afh-error` outside components whose filename contains Error/Invalid/Broken (UX-DR49 rule 3).",
      recommended: false,
    },
    schema: [],
    messages: {
      misuse:
        "`--afh-error` is reserved for Error / Invalid / Broken components. " +
        "Rename the component (e.g. *ErrorState.tsx) or pick a non-error token " +
        "(--afh-flag-open, --afh-conf-low, --afh-classification-disputed).",
    },
  },

  create(context) {
    const filename = context.filename || context.getFilename?.() || "";
    if (filenameImpliesErrorContext(filename)) {
      return {};
    }

    /**
     * @param {{ value?: unknown }} node
     * @returns {string | null}
     */
    function literalText(node) {
      if (typeof node.value === "string") return node.value;
      return null;
    }

    function check(node, text) {
      if (!text) return;
      if (ERROR_TOKEN_RE.test(text) || TAILWIND_ERROR_RE.test(text)) {
        context.report({ node, messageId: "misuse" });
      }
    }

    return {
      Literal(node) {
        check(node, literalText(node));
      },
      TemplateElement(node) {
        const raw = node.value && (node.value.cooked ?? node.value.raw);
        check(node, raw || "");
      },
      JSXText(node) {
        check(node, node.value || "");
      },
    };
  },
};
