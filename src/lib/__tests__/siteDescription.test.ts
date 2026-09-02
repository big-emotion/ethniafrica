import { describe, expect, it, vi } from "vitest";

// The root layout is imported for its `metadata` alone; next/font/google is a
// build-time loader that does not run under vitest (same stub as
// fiche-seo-baseline.test.ts).
vi.mock("next/font/google", () => {
  const fontLoader = () => ({
    variable: "--font-stub",
    className: "font-stub",
  });
  return {
    Fraunces: fontLoader,
    JetBrains_Mono: fontLoader,
    Nunito_Sans: fontLoader,
  };
});

import { MODULE_DEFINITIONS } from "@/lib/hubs/moduleRegistry";
import { OG_DESCRIPTION } from "@/lib/brand";
import { translations } from "@/lib/translations";
import { metadata } from "@/app/layout";

/**
 * The noun each corpus class wears in a sentence, from the registry rather
 * than restated here — the point of the whole exercise. A class is an atlas
 * module with a `dataSource`; `recherche` has none, being a way in rather
 * than a thing the corpus holds.
 */
const corpusNouns = MODULE_DEFINITIONS.filter(
  (module) => module.accessMode === "atlas" && module.dataSource
).map((module) => {
  expect(
    module.corpusNoun,
    `module ${module.id} is a corpus class and declares no corpusNoun`
  ).toBeTruthy();
  return module.corpusNoun as string;
});

/**
 * Every sentence whose job is to say what the atlas contains, to a reader who
 * has not arrived yet: the meta description a search engine prints, the
 * OpenGraph blurb a shared link previews, and the subtitle drawn *into* the
 * social card images (opengraph-image.tsx, twitter-image.tsx).
 */
const descriptions = () => [
  ["metadata.description", String(metadata.description ?? "")],
  ["OG_DESCRIPTION", OG_DESCRIPTION],
  ["translations.fr.subtitle", translations.fr.subtitle],
];

describe("what the site says it contains, before anyone arrives", () => {
  // These three strings are the meta description, the social-card blurb and
  // their translation entry: what a search engine prints and what a shared
  // link previews. They named four of the six classes — the atlas grew a
  // language axis and a name axis and none of the three noticed — which made
  // the most-read sentence about the product the most out of date.
  // @req REQ-019
  it("names every class the corpus holds", () => {
    expect(corpusNouns.length).toBeGreaterThanOrEqual(6);

    for (const [label, description] of descriptions()) {
      const folded = description.toLowerCase();
      for (const noun of corpusNouns) {
        expect(folded, `${label} omits ${noun}`).toContain(noun.toLowerCase());
      }
    }
  });

  // A description that states a count states it about a corpus that moves.
  // These said "55 pays africains" while afrik_countries held 54 and the rest
  // of the product said 54 in six other places; the enumeration above already
  // says "pays", so the figure was carrying no meaning it could get wrong.
  // @req REQ-019
  it("promises no figure the corpus has to keep up with", () => {
    for (const [label, description] of descriptions()) {
      expect(description, `${label} states a count`).not.toMatch(/\d/);
    }
  });
});
