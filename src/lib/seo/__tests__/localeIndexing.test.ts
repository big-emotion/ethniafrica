import { beforeEach, describe, expect, it, vi } from "vitest";

const { ficheHasTranslationMock } = vi.hoisted(() => ({
  ficheHasTranslationMock: vi.fn(),
}));

vi.mock("@/lib/seo/translationParity", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  ficheHasTranslation: (...args: unknown[]) => ficheHasTranslationMock(...args),
}));

import { LOCALES } from "@/lib/locale";
import {
  getLocalizedRoute,
  getNommerChapterRoute,
  getStaticPageRoute,
} from "@/lib/routing";
import {
  SURFACES_AT_PARITY,
  ficheIndexedLocales,
  robotsForLocale,
  surfaceForPath,
  surfaceIndexedLocales,
} from "@/lib/seo/localeIndexing";

/**
 * Indexing before parity (REQ-141, second acceptance criterion): a surface
 * is offered to a locale's index only once its chrome and its content read
 * in that locale. Until then it is served — a reader who lands there gets
 * the page — but a crawler is told not to index it and the sitemap does not
 * list it.
 */

beforeEach(() => {
  vi.clearAllMocks();
  ficheHasTranslationMock.mockImplementation(
    async (_kind: string, _id: string, lang: string) => lang === "fr"
  );
});

describe("surfaceIndexedLocales", () => {
  // @req REQ-141
  it("indexes a surface at parity in every published locale", () => {
    for (const surface of SURFACES_AT_PARITY) {
      expect(surfaceIndexedLocales(surface)).toEqual([...LOCALES]);
    }
  });

  // @req REQ-141
  it("indexes a surface not yet at parity in French only", () => {
    // The legal notice is machine-translated with a French-prevails notice
    // and stays outside the parity list until the translation lands.
    expect(SURFACES_AT_PARITY).not.toContain("legalNotice");
    expect(surfaceIndexedLocales("legalNotice")).toEqual(["fr"]);
    expect(surfaceIndexedLocales("home")).toEqual(["fr"]);
  });

  // The list is the lever each translation wave pulls. It is measured, not
  // aspirational: a surface enters it when its page copy comes from the
  // locale dictionary and what it lists needs no translating.
  // @req REQ-141
  it("lists the ethnonym index, whose copy is dictionary-driven and whose rows are proper nouns", () => {
    expect(SURFACES_AT_PARITY).toContain("names");
  });
});

describe("robotsForLocale", () => {
  // @req REQ-141
  it("withholds a locale outside the indexed set, links still followed", () => {
    expect(robotsForLocale("en", ["fr"])).toEqual({
      index: false,
      follow: true,
    });
  });

  // @req REQ-141
  it("says nothing for an indexed locale, so the root layout's default stands", () => {
    expect(robotsForLocale("fr", ["fr"])).toBeUndefined();
    expect(robotsForLocale("en", LOCALES)).toBeUndefined();
  });
});

describe("ficheIndexedLocales", () => {
  // @req REQ-141
  it("indexes a fiche wherever a translation record exists for it", async () => {
    ficheHasTranslationMock.mockResolvedValue(true);

    expect(await ficheIndexedLocales("people", "PPL_YORUBA")).toEqual([
      ...LOCALES,
    ]);
    expect(ficheHasTranslationMock).toHaveBeenCalledWith(
      "people",
      "PPL_YORUBA",
      "en"
    );
  });

  // @req REQ-141
  it("indexes a fiche with no English record in French only", async () => {
    expect(await ficheIndexedLocales("country", "BEN")).toEqual(["fr"]);
  });

  // A parity read that fails must not de-list the French fiche, which is
  // the one the corpus is written in.
  // @req REQ-141
  it("falls back to French only when the parity read fails", async () => {
    ficheHasTranslationMock.mockRejectedValue(new Error("timeout"));

    expect(await ficheIndexedLocales("family", "FLG_BANTU")).toEqual(["fr"]);
  });
});

describe("surfaceForPath", () => {
  // @req REQ-141
  it("names the surface a rubric path addresses, in either locale", () => {
    expect(surfaceForPath("en", "/en")).toBe("home");
    expect(surfaceForPath("fr", getLocalizedRoute("fr", "names"))).toBe(
      "names"
    );
    expect(surfaceForPath("en", getLocalizedRoute("en", "names"))).toBe(
      "names"
    );
    expect(surfaceForPath("en", getStaticPageRoute("en", "sitemap"))).toBe(
      "sitemap"
    );
    expect(surfaceForPath("fr", getNommerChapterRoute("fr", "le-peuple"))).toBe(
      "nommer"
    );
  });

  // @req REQ-141
  it("files a game under the games surface rather than the retired hub", () => {
    expect(
      surfaceForPath("en", `${getLocalizedRoute("en", "jeuxHub")}/mercator`)
    ).toBe("games");
  });

  // @req REQ-141
  it("answers null for a path outside the locale's vocabulary", () => {
    expect(surfaceForPath("en", "/docs/api/v2")).toBeNull();
  });
});
