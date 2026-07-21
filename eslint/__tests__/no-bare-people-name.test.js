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
    // --- The sanctioned way to render a people name -----------------------
    {
      code: `<AutonymExonymHeading nameMain={data.nameMain} exonyms={data.exonyms} />`,
    },
    {
      code: `<AutonymExonymHeading autonym={people.autonym} autonymIso639_3="yor" />`,
    },
    // Name-bearing binding nested inside the heading's children
    {
      code: `<AutonymExonymHeading nameMain="x" exonyms={[]}><span>{data.nameMain}</span></AutonymExonymHeading>`,
    },

    // --- UI chrome must never trip the rule -------------------------------
    // These are the false positives that made the previous heuristic
    // (any capitalised word) unusable: 43 errors, none of them real.
    { code: `<span>Retour</span>` },
    { code: `<h2>Spiritualité</h2>` },
    { code: `<button>Signaler une erreur</button>` },
    { code: `<span>← Afrique</span>` },
    { code: `<h3>Sources et références</h3>` },

    // --- Bindings that carry something other than a people name -----------
    { code: `<span>{data.languageFamilyName}</span>` },
    { code: `<span>{country.name}</span>` },
    { code: `<span>{data.currentCountries.length} pays</span>` },
    { code: `<div>{42}</div>` },
    // `length` is the final property, so the expression is a count, not a name
    { code: `<span>{data.exonyms.length}</span>` },
    // Iteratee of a collection that is not name-bearing
    { code: `<>{kingdoms.map((k) => <span>{k}</span>)}</>` },

    // --- Hardcoded literals are out of scope by design --------------------
    // Telling "Yoruba" from "Retour" statically needs the AFRIK name corpus;
    // this rule deliberately covers only data bindings. See the rule header.
    { code: `<p>{"Yoruba"}</p>` },
    { code: `<div>Yoruba</div>` },
  ],

  invalid: [
    // --- Direct member bindings -------------------------------------------
    {
      code: `<h1>{data.nameMain}</h1>`,
      errors: [{ messageId: "noBarePeopleName", data: { name: "nameMain" } }],
    },
    {
      code: `<span>{people.selfAppellation}</span>`,
      errors: [
        { messageId: "noBarePeopleName", data: { name: "selfAppellation" } },
      ],
    },
    {
      code: `<p>{raw.appellations.autonym}</p>`,
      errors: [{ messageId: "noBarePeopleName", data: { name: "autonym" } }],
    },
    // Bare identifier destructured from the data
    {
      code: `<h2>{nameMain}</h2>`,
      errors: [{ messageId: "noBarePeopleName", data: { name: "nameMain" } }],
    },

    // --- Computed access: the collection carries the name ------------------
    {
      code: `<p>{data.exonyms[0]}</p>`,
      errors: [{ messageId: "noBarePeopleName", data: { name: "exonyms" } }],
    },

    // --- Iteration over a name-bearing collection --------------------------
    {
      code: `<>{data.exonyms.map((exo) => <span>{exo}</span>)}</>`,
      errors: [{ messageId: "noBarePeopleName", data: { name: "exonyms" } }],
    },
    {
      code: `<>{alternateNames.map((n) => <li>{n}</li>)}</>`,
      errors: [
        { messageId: "noBarePeopleName", data: { name: "alternateNames" } },
      ],
    },

    // --- Nested outside the heading ----------------------------------------
    {
      code: `<section><div><span>{data.nameMain}</span></div></section>`,
      errors: [{ messageId: "noBarePeopleName", data: { name: "nameMain" } }],
    },
    // A sibling of the heading is still outside it
    {
      code: `<div><AutonymExonymHeading nameMain="x" exonyms={[]} /><span>{data.nameMain}</span></div>`,
      errors: [{ messageId: "noBarePeopleName", data: { name: "nameMain" } }],
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
