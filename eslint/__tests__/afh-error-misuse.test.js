/**
 * Unit test for the `afh/afh-error-misuse` ESLint rule (ETNI-21).
 *
 * Uses ESLint's official `RuleTester` so it stays current with the
 * resolver behaviour of the host project (ESLint v9 flat config).
 */

"use strict";

const { RuleTester } = require("eslint");
const rule = require("../rules/afh-error-misuse.js");

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run("afh/afh-error-misuse", rule, {
  valid: [
    {
      // Component file IS an Error component — `--afh-error` is fair game.
      name: "Allowed in ErrorState.tsx",
      code: `const style = { color: "var(--afh-error)" };`,
      filename: "src/components/ErrorState.tsx",
    },
    {
      name: "Allowed in InvalidInput.tsx",
      code: `const style = { background: "var(--afh-error-bg)" };`,
      filename: "src/components/InvalidInput.tsx",
    },
    {
      name: "Allowed in BrokenLinkBanner.tsx",
      code: 'const cls = "bg-afh-error text-white";',
      filename: "src/components/BrokenLinkBanner.tsx",
    },
    {
      // Unrelated component using a non-error token — should pass.
      name: "Non-error token in unrelated component",
      code: `const style = { color: "var(--afh-conf-high)" };`,
      filename: "src/components/SourceBadge.tsx",
    },
  ],
  invalid: [
    {
      name: "var(--afh-error) in unrelated component",
      code: `const style = { color: "var(--afh-error)" };`,
      filename: "src/components/SourceBadge.tsx",
      errors: [{ messageId: "misuse" }],
    },
    {
      name: "Tailwind text-afh-error in unrelated component",
      code: 'const cls = "text-afh-error font-bold";',
      filename: "src/components/Hero.tsx",
      errors: [{ messageId: "misuse" }],
    },
    {
      name: "Template literal embedding --afh-error-bg",
      code: "const css = `background: var(--afh-error-bg);`;",
      filename: "src/components/Hero.tsx",
      errors: [{ messageId: "misuse" }],
    },
    {
      // Regression: directory contains "error" but basename does not — must NOT bypass.
      name: "Path-only 'error' must not bypass (issue 1)",
      code: `const style = { color: "var(--afh-error)" };`,
      filename: "src/components/error-states/SourceBadge.tsx",
      errors: [{ messageId: "misuse" }],
    },
    {
      // Regression: basename contains "invalid" as substring but the tokenised
      // word is "Validator" — must NOT bypass (issue 2).
      name: "Substring 'invalid' in 'InValidatorWidget' must not bypass (issue 2)",
      code: `const style = { color: "var(--afh-error)" };`,
      filename: "src/components/InValidatorWidget.tsx",
      errors: [{ messageId: "misuse" }],
    },
    {
      // Regression: gradient utility (`from-afh-error`) must be flagged (issue 4).
      name: "Tailwind from-afh-error gradient is flagged",
      code: 'const cls = "from-afh-error to-transparent";',
      filename: "src/components/Hero.tsx",
      errors: [{ messageId: "misuse" }],
    },
    {
      // Regression: placeholder utility must be flagged (issue 4).
      name: "Tailwind placeholder-afh-error is flagged",
      code: 'const cls = "placeholder-afh-error";',
      filename: "src/components/Hero.tsx",
      errors: [{ messageId: "misuse" }],
    },
  ],
});

// RuleTester auto-runs assertions on import in some test runners; under Vitest
// we trigger explicitly so the file is exercised whether invoked via
// `node --test`, Vitest, or `npx mocha`.
if (typeof describe === "undefined") {
  // RuleTester.run already throws on failure when used outside Mocha-style
  // runners, so reaching this line means all cases passed.
  console.log("afh-error-misuse: all cases passed");
}
