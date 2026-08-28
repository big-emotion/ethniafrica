/**
 * Unit test for the `afh/no-raw-font-size` ESLint rule.
 *
 * This file MUST stay `.js` and MUST stay in this directory: `vitest.config.ts`
 * picks up RuleTester suites through the single pattern
 * `eslint/__tests__/**\/*.test.js`. A `.js` anywhere else under `eslint/` never
 * runs, silently — which is how `no-bare-people-name` shipped with a heuristic
 * that flagged 43 UI labels and zero people names.
 */

"use strict";

const { RuleTester } = require("eslint");
const rule = require("../rules/no-raw-font-size.js");

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run("afh/no-raw-font-size", rule, {
  valid: [
    {
      name: "the Tailwind bridge utility",
      code: 'const cls = "text-afh-body text-afh-caption";',
      filename: "src/components/fiche/FichePanel.tsx",
    },
    {
      name: "a token read through var() — the sanctioned CSS escape hatch",
      code: "const css = `.x { font-size: var(--afh-text-body); }`;",
      filename: "src/components/layout/SiteHeader.tsx",
    },
    {
      name: "a surface-scoped token read through the arbitrary-value syntax",
      code: 'const cls = "text-[length:var(--country-text-caption)]";',
      filename: "src/components/country/CountryHero.tsx",
    },
    {
      name: "satori inline styles — a raster parameter, not typography",
      code: "const el = <div style={{ fontSize: 22 }} />;",
      filename: "src/app/opengraph-image.tsx",
    },
    {
      name: "a Recharts numeric prop",
      code: "const el = <XAxis fontSize={11} />;",
      filename: "src/components/charts/DemographicsChart.tsx",
    },
    {
      name: "a canvas label size computed in JS",
      code: "const size = 11; ctx.font = `${size}px sans-serif`;",
      filename: "src/components/atlas/AtlasTargetPicker.tsx",
    },
    {
      name: "leading and tracking are out of scope by choice",
      code: 'const cls = "leading-[18px] tracking-[0.16em]";',
      filename: "src/components/home/HomeHero.tsx",
    },
    {
      name: "a word that merely contains font-size",
      code: 'const key = "fontSizeOverride";',
      filename: "src/components/ui/button.tsx",
    },
  ],

  invalid: [
    {
      name: "an arbitrary Tailwind pixel size",
      code: 'const cls = "text-[14px] font-bold";',
      filename: "src/components/country/PeoplesSection.tsx",
      errors: [{ messageId: "arbitraryUtility" }],
    },
    {
      name: "an arbitrary size behind a breakpoint prefix",
      code: 'const cls = "xl:text-[10px]";',
      filename: "src/components/country/CountryHero.tsx",
      errors: [{ messageId: "arbitraryUtility" }],
    },
    {
      name: "an arbitrary rem size",
      code: 'const cls = "text-[0.8125rem]";',
      filename: "src/components/people/PeopleDetailViewV2.tsx",
      errors: [{ messageId: "arbitraryUtility" }],
    },
    {
      name: "an arbitrary size inside an object property, not a className",
      code: 'const map = { autonymClasses: "font-display text-[11px] uppercase" };',
      filename: "src/components/ui/AutonymExonymHeading.tsx",
      errors: [{ messageId: "arbitraryUtility" }],
    },
    {
      name: "an arbitrary size in a template literal chunk",
      code: "const cls = `base ${tone} text-[13px]`;",
      filename: "src/components/hubs/JouerFaceOff.tsx",
      errors: [{ messageId: "arbitraryUtility" }],
    },
    {
      name: "a raw styled-jsx declaration",
      code: "const css = `.x { font-size: 13px; }`;",
      filename: "src/components/layout/SiteHeader.tsx",
      errors: [{ messageId: "rawDeclaration" }],
    },
    {
      name: "a raw clamp() declaration",
      code: "const css = `.hero { font-size: clamp(30px, 5.6vw, 56px); }`;",
      filename: "src/components/home/HomeHero.tsx",
      errors: [{ messageId: "rawDeclaration" }],
    },
    {
      name: "a raw declaration in a plain string style block",
      code: 'const css = ".x { font-size: 0.9rem; }";',
      filename: "src/components/home/AccessAxes.tsx",
      errors: [{ messageId: "rawDeclaration" }],
    },
    {
      name: "a var() fallback that smuggles a literal back in",
      code: "const css = `.x { font-size: var(--home-text-hero, 15.5px); }`;",
      filename: "src/components/home/HomeHero.tsx",
      errors: [{ messageId: "rawDeclaration" }],
    },
    {
      name: "both offences in one file are both reported",
      code: 'const cls = "text-[14px]"; const css = `.x { font-size: 12px; }`;',
      filename: "src/components/country/SourcesFooter.tsx",
      errors: [
        { messageId: "arbitraryUtility" },
        { messageId: "rawDeclaration" },
      ],
    },
  ],
});
