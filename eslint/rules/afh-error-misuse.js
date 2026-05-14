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

const path = require("node:path");

const ALLOWED_NAME_TOKENS = ["error", "invalid", "broken"];
const ERROR_TOKEN_RE = /--afh-error\b/;
// Tailwind utility prefixes that can carry an `-afh-error` colour. This list is
// intentionally broad — every colour-bearing utility family is covered so we
// don't silently miss e.g. `from-afh-error` in a gradient.
const TAILWIND_ERROR_RE =
  /\b(?:bg|text|border|ring|shadow|fill|stroke|outline|from|via|to|divide|placeholder|accent|caret)-afh-error\b/;

/**
 * Word-boundary match of an allowed token against the **basename only**.
 * Splitting the basename on non-alphanumeric characters keeps the match
 * strict: `ErrorState.tsx` → ["ErrorState", "tsx"] → ["Error", "State"]
 * via CamelCase split, so "error" matches. `InValidatorWidget.tsx` →
 * ["InValidatorWidget"] → ["In", "Validator", "Widget"] — none of those
 * tokens equals "invalid", so the file does NOT bypass the rule.
 *
 * Tokenisation:
 *   1. Take basename only (ignore directory path entirely).
 *   2. Split on non-alphanumeric chars (`-`, `_`, `.`, etc.).
 *   3. Split each chunk on CamelCase boundaries.
 *   4. Lowercase, then test against the allow-list exactly.
 *
 * @param {string} filename
 * @returns {boolean}
 */
function filenameImpliesErrorContext(filename) {
  if (!filename) return false;
  const base = path.basename(filename);
  // Strip extensions (handles .stories.tsx, .test.ts, etc. defensively).
  const stem = base.replace(/\..*$/, "");
  // Split on non-alphanumeric, then on CamelCase boundaries.
  const tokens = stem
    .split(/[^A-Za-z0-9]+/)
    .flatMap((chunk) => chunk.split(/(?=[A-Z])/))
    .map((tok) => tok.toLowerCase())
    .filter(Boolean);
  return tokens.some((tok) => ALLOWED_NAME_TOKENS.includes(tok));
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
