import { describe, expect, it } from "vitest";

import { LOCALES } from "@/lib/locale";
import { ACCESS_MODE_LABELS } from "@/lib/hubs/moduleRegistry";
import {
  COMPARE_ENTITY_SEGMENTS,
  NOMMER_CHAPTER_KEYS,
  PAGE_TYPES,
  STATIC_PAGE_SLUGS,
  getNommerChapterRoute,
  getPeopleLinksRoute,
} from "@/lib/routing";
import {
  classificationLabels,
  getTranslation,
  translations,
} from "@/lib/translations";

/**
 * `trail.segments` is keyed by URL segment, and the URL segments differ by
 * locale on purpose (DEC-049) — so it is the one branch where the two
 * dictionaries are not expected to share keys. It is held to the routing
 * tables instead, below.
 */
const URL_KEYED_BRANCH = "trail.segments";

/**
 * Every dotted leaf path of a dictionary, so two locales can be compared by
 * shape rather than by content.
 */
function leafPaths(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix];
  if (prefix === URL_KEYED_BRANCH) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    leafPaths(child, prefix ? `${prefix}.${key}` : key)
  );
}

function leafValues(value: unknown, prefix = ""): [string, unknown][] {
  if (typeof value !== "object" || value === null) return [[prefix, value]];
  return Object.entries(value).flatMap(([key, child]) =>
    leafValues(child, prefix ? `${prefix}.${key}` : key)
  );
}

describe("the UI dictionary in both locales (REQ-145)", () => {
  // @req REQ-145
  it("publishes a dictionary for every locale", () => {
    for (const locale of LOCALES) {
      expect(getTranslation(locale)).toBeDefined();
      expect(getTranslation(locale)).toBe(translations[locale]);
    }
  });

  // A key present in one locale and absent in the other is a label that
  // renders as `undefined` on one side of the site with a green build.
  // @req REQ-145
  it("gives the English and French dictionaries the same nested keys", () => {
    expect(leafPaths(translations.en).sort()).toEqual(
      leafPaths(translations.fr).sort()
    );
  });

  // @req REQ-145
  it("leaves no empty string in either locale", () => {
    for (const locale of LOCALES) {
      for (const [path, value] of leafValues(translations[locale])) {
        expect(typeof value, path).toBe("string");
        expect((value as string).trim().length, path).toBeGreaterThan(0);
      }
    }
  });

  // The English chrome keeps the brand strings the French one composes
  // from: the name is the name in both languages.
  // @req REQ-145
  it("composes the brand strings the same way in both locales", () => {
    expect(translations.en.title).toBe(translations.fr.title);
    expect(translations.en.footer.attribution).toBe(
      translations.fr.footer.attribution
    );
  });

  // @req REQ-145
  it("keeps the French hub titles on the canonical access-mode map", () => {
    expect(translations.fr.hubs.atlas.title).toBe(ACCESS_MODE_LABELS.atlas);
    expect(translations.en.hubs.atlas.title).toBe("The atlas");
    expect(translations.en.hubs.dossiers.title).toBe("The dossiers");
    expect(translations.en.hubs.jeux.title).toBe("Play");
  });

  // @req REQ-023
  it("keeps the classification labels on the French dictionary", () => {
    expect(classificationLabels).toBe(translations.fr.classification);
  });
});

describe("the trail's words follow each locale's URLs (REQ-141)", () => {
  // @req REQ-141
  it("names every page type in both locales", () => {
    for (const locale of LOCALES) {
      for (const page of PAGE_TYPES) {
        expect(translations[locale].trail.pages[page], page).toBeTruthy();
      }
    }
    expect(translations.en.trail.pages.countries).toBe("Countries");
    expect(translations.en.trail.pages.patronymes).toBe("Names");
    expect(translations.en.trail.pages.names).toBe("Ethnonyms");
    expect(translations.en.trail.pages.colonization).toBe(
      "Colonisation & resistances"
    );
  });

  // `deriveTrail` looks a segment up by the word in the URL, so the English
  // map has to be keyed by the English tails or English trails truncate.
  // @req REQ-141
  it("keys the segment map by the tails of that locale's own URLs", () => {
    for (const locale of LOCALES) {
      const segments = translations[locale].trail.segments;
      const linksTail = getPeopleLinksRoute(locale, "PPL_X").split("/").pop();
      expect(segments[linksTail], `${locale} ${linksTail}`).toBeTruthy();

      for (const chapter of NOMMER_CHAPTER_KEYS) {
        const tail = getNommerChapterRoute(locale, chapter).split("/").pop();
        expect(segments[tail], `${locale} ${tail}`).toBeTruthy();
      }

      for (const slug of Object.values(STATIC_PAGE_SLUGS[locale])) {
        expect(segments[slug], `${locale} ${slug}`).toBeTruthy();
      }

      for (const segment of Object.values(COMPARE_ENTITY_SEGMENTS[locale])) {
        expect(segments[segment], `${locale} ${segment}`).toBeTruthy();
      }
    }
    expect(translations.en.trail.segments.links).toBe("Links");
    expect(translations.en.trail.segments["the-people"]).toBe("The people");
    expect(translations.en.trail.segments.peoples).toBe("Peoples");
    expect(translations.en.trail.segments.countries).toBe("Countries");
    expect(translations.en.trail.segments.families).toBe("Families");
    expect(translations.fr.trail.segments.liens).toBe("Liens");
  });
});
