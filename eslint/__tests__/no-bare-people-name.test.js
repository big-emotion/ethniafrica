/**
 * Unit test for the `afh/no-bare-people-name` ESLint rule (UX-DR49 #1).
 *
 * Uses ESLint's official `RuleTester` so it stays current with the
 * resolver behaviour of the host project (ESLint v9 flat config).
 */

"use strict";

const { RuleTester } = require("eslint");
const rule = require("../rules/no-bare-people-name.js");

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run("no-bare-people-name", rule, {
  valid: [
    // Inside AutonymExonymHeading as prop — OK
    {
      code: `<AutonymExonymHeading autonym="Yoruba" autonymIso639_3="yor" />`,
    },
    // JSXText inside AutonymExonymHeading — OK
    {
      code: `<AutonymExonymHeading autonym="x" autonymIso639_3="xyz">Yoruba</AutonymExonymHeading>`,
    },
    // lowercase text — not a proper noun
    {
      code: `<div>hello world</div>`,
    },
    // empty / whitespace-only JSXText
    {
      code: `<div>   </div>`,
    },
    // Proper noun but nested inside AutonymExonymHeading deeper
    {
      code: `<AutonymExonymHeading autonym="x" autonymIso639_3="xyz"><span>Yoruba</span></AutonymExonymHeading>`,
    },
  ],
  invalid: [
    // Bare proper noun in JSX outside AutonymExonymHeading
    {
      code: `<div>Yoruba</div>`,
      errors: [{ messageId: "noBarepeopleName" }],
    },
    {
      code: `<span>Hausa people</span>`,
      errors: [{ messageId: "noBarepeopleName" }],
    },
    // Proper noun in a sibling element outside AutonymExonymHeading
    {
      code: `<section><h1>Igbo</h1></section>`,
      errors: [{ messageId: "noBarepeopleName" }],
    },
  ],
});

// RuleTester auto-runs assertions on import in some test runners; under Vitest
// we trigger explicitly so the file is exercised whether invoked via
// `node --test`, Vitest, or `npx mocha`.
if (typeof describe === "undefined") {
  // RuleTester.run already throws on failure when used outside Mocha-style
  // runners, so reaching this line means all cases passed.
  console.log("no-bare-people-name: all cases passed");
}
