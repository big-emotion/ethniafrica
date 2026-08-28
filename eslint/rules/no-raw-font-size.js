/**
 * `afh/no-raw-font-size` — one typographic scale, and only one.
 *
 * The audit behind `docs/design/typography-charter.md` found three systems
 * coexisting: the `--afh-text-*` tokens, the `text-afh-*` Tailwind bridge, and
 * 543 sizes written by hand. This rule closes the third.
 *
 * Two offences, both reachable from a node's text content, which is why this
 * is one rule and not two:
 *
 *   1. `arbitraryUtility` — an arbitrary Tailwind size: `text-[14px]`,
 *      `xl:text-[10px]`, `text-[0.875rem]`.
 *   2. `rawDeclaration`   — a CSS `font-size` whose value carries a length
 *      literal: `font-size: 13px`, `font-size: clamp(30px, 5.6vw, 56px)`,
 *      and `font-size: var(--x, 15.5px)` — a var() fallback is still a hard
 *      coded size, and letting it through would leave the ratchet a hole
 *      wide enough to migrate a whole surface into.
 *
 * The sanctioned escapes are `text-afh-<role>`, `font-size: var(--…)` with no
 * literal fallback, and `text-[length:var(--…)]` for a surface-scoped token.
 *
 * ── Scope, and why it stops where it does ────────────────────────────────
 *
 * The rule visits `Literal`, `TemplateElement` and `JSXText` — text content
 * only. It deliberately has NO `Property` / `fontSize` visitor. More than
 * forty numeric `fontSize` values in this repo are legitimate and must stay:
 * the satori OG-image routes (`src/app/opengraph-image.tsx`,
 * `twitter-image.tsx`, `api/og/quiz-score/route.tsx`), Recharts
 * (`charts/DemographicsChart.tsx`), and the canvas/SVG label helpers
 * (`atlas/AtlasTargetPicker.tsx`, `country/countryTargetFacts.tsx`,
 * `family/familyTargetFacts.tsx`). Those are rendering parameters for a
 * raster or a chart, not typography. Staying on text content means there is
 * no exception list to maintain and none to fall out of date.
 *
 * ── Known blind spots ────────────────────────────────────────────────────
 *
 *   · `cn(`text-[${n}px]`)` is composed at runtime. The template chunks the
 *     rule sees are `text-[` and `px]`, neither of which is a size. Dynamic
 *     construction is undetectable by any static rule and is not worked
 *     around here.
 *   · `.css` files are never parsed by ESLint, so `country-tokens.css`
 *     (11 literals) and `people-tokens.css` (6) are outside this ratchet.
 *     They are guarded by `src/styles/__tests__/colorTokens.test.ts`, which
 *     already resolves and parses them.
 *   · `leading-[Npx]` and `tracking-[Nem]` are out of scope by choice. The
 *     charter binds a leading to each role, but a one-off leading is a
 *     spacing decision, not a second type scale.
 */

"use strict";

/** `text-[14px]`, `xl:text-[10px]`, `text-[0.875rem]` — but not `text-[length:var(…)]`. */
const ARBITRARY_UTILITY_RE = /\btext-\[\d+(?:\.\d+)?(?:px|rem|em)\]/;

/** A `font-size` declaration and everything up to its terminator. */
const FONT_SIZE_DECL_RE = /font-size\s*:\s*([^;}"'`]+)/g;

/** A length literal anywhere inside a declaration value. */
const LENGTH_LITERAL_RE = /\d*\.?\d+(?:px|rem|em|pt|ex|ch)\b/;

/**
 * True when a `font-size` value hard-codes a length rather than reading a
 * token. `var(--afh-text-body)` passes; `var(--x, 15.5px)` does not.
 *
 * @param {string} text
 * @returns {boolean}
 */
function declaresRawSize(text) {
  FONT_SIZE_DECL_RE.lastIndex = 0;
  for (const match of text.matchAll(FONT_SIZE_DECL_RE)) {
    if (LENGTH_LITERAL_RE.test(match[1])) return true;
  }
  return false;
}

/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow font sizes written outside the --afh-text-* scale (typography charter §6).",
      recommended: false,
    },
    schema: [],
    messages: {
      arbitraryUtility:
        "Arbitrary font size. Use a scale utility (`text-afh-body`, " +
        "`text-afh-caption`, …) or, for a surface-scoped token, " +
        "`text-[length:var(--…)]`. See docs/design/typography-charter.md §6.",
      rawDeclaration:
        "Hard-coded `font-size`. Read a token instead: " +
        "`font-size: var(--afh-text-body)`. A var() fallback carrying a " +
        "literal counts as hard-coded. See docs/design/typography-charter.md §6.",
    },
  },

  create(context) {
    function check(node, text) {
      if (!text) return;
      if (ARBITRARY_UTILITY_RE.test(text)) {
        context.report({ node, messageId: "arbitraryUtility" });
      }
      if (declaresRawSize(text)) {
        context.report({ node, messageId: "rawDeclaration" });
      }
    }

    return {
      Literal(node) {
        check(node, typeof node.value === "string" ? node.value : null);
      },
      TemplateElement(node) {
        check(
          node,
          (node.value && (node.value.cooked ?? node.value.raw)) || ""
        );
      },
      JSXText(node) {
        check(node, node.value || "");
      },
    };
  },
};
