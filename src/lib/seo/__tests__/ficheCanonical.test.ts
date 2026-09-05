import { beforeEach, describe, expect, it, vi } from "vitest";

const { ficheHasTranslationMock } = vi.hoisted(() => ({
  ficheHasTranslationMock: vi.fn(),
}));

vi.mock("@/lib/seo/translationParity", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  ficheHasTranslation: (...args: unknown[]) => ficheHasTranslationMock(...args),
}));

import { CANONICAL_DOMAIN } from "@/lib/brand";
import {
  getCountryRoute,
  getFamilyRoute,
  getLanguageRoute,
  getPatronymeRoute,
  getPeopleLinksRoute,
  getPeopleRoute,
} from "@/lib/routing";
import { ficheCanonical, type FicheKind } from "@/lib/seo/ficheCanonical";

/**
 * What a fiche says about itself to a crawler: an absolute canonical on the
 * live fiche, and — since REQ-141 — its hreflang cluster, its robots
 * directive and its Open Graph card, all following the locales the fiche is
 * indexed in.
 */

const BASE = `https://${CANONICAL_DOMAIN}`;

const ROUTES: Record<FicheKind, [id: string, route: typeof getPeopleRoute]> = {
  people: ["PPL_YORUBA", getPeopleRoute],
  country: ["BEN", getCountryRoute],
  family: ["FLG_BANTU", getFamilyRoute],
  language: ["yor", getLanguageRoute],
  name: ["PAT_KEITA", getPatronymeRoute],
  peopleLinks: ["PPL_YORUBA", getPeopleLinksRoute],
};

beforeEach(() => {
  vi.clearAllMocks();
  ficheHasTranslationMock.mockImplementation(
    async (_kind: string, _id: string, lang: string) => lang === "fr"
  );
});

describe("ficheCanonical", () => {
  for (const [kind, [id, route]] of Object.entries(ROUTES) as [
    FicheKind,
    (typeof ROUTES)[FicheKind],
  ][]) {
    // @req REQ-091
    it(`declares the ${kind} fiche's canonical absolute, on the canonical domain`, async () => {
      const metadata = await ficheCanonical(kind, "fr", id);

      expect(metadata.alternates?.canonical).toBe(`${BASE}${route("fr", id)}`);
    });
  }

  // A pinned revision renders an archived copy of the same prose at a second
  // address; its canonical is the live fiche, never itself.
  // @req REQ-091
  it("drops a pinned or latest version suffix from the canonical", async () => {
    const pinned = await ficheCanonical("people", "fr", "PPL_YORUBA@v3");
    const latest = await ficheCanonical("people", "fr", "PPL_YORUBA@latest");

    expect(pinned.alternates?.canonical).toBe(
      `${BASE}${getPeopleRoute("fr", "PPL_YORUBA")}`
    );
    expect(latest.alternates?.canonical).toBe(pinned.alternates?.canonical);
  });

  // A 404 that claims a canonical is a 404 asking to be indexed.
  // @req REQ-091
  it("declares nothing for a slug that names no fiche", async () => {
    expect(await ficheCanonical("people", "fr", "PPL_YORUBA@V3")).toEqual({});
    expect(await ficheCanonical("people", "fr", "")).toEqual({});
  });

  // @req REQ-091
  it("keeps the identifier percent-encoded in the address", async () => {
    const metadata = await ficheCanonical("name", "fr", "PAT%20KEITA");

    expect(metadata.alternates?.canonical).toBe(
      `${BASE}${getPatronymeRoute("fr", "PAT%20KEITA")}`
    );
  });

  // @req REQ-141
  it("clusters only the French address while the fiche has no English record", async () => {
    const french = await ficheCanonical("people", "fr", "PPL_YORUBA");
    const english = await ficheCanonical("people", "en", "PPL_YORUBA");

    expect(french.alternates?.languages).toEqual({
      fr: `${BASE}${getPeopleRoute("fr", "PPL_YORUBA")}`,
    });
    expect(french).not.toHaveProperty("robots");
    expect(english.alternates?.canonical).toBe(
      `${BASE}${getPeopleRoute("en", "PPL_YORUBA")}`
    );
    expect(english.robots).toEqual({ index: false, follow: true });
  });

  // @req REQ-141
  it("clusters both locales, x-default on English, once a record exists", async () => {
    ficheHasTranslationMock.mockResolvedValue(true);

    const metadata = await ficheCanonical("country", "en", "BEN");

    expect(metadata.alternates?.languages).toEqual({
      en: `${BASE}${getCountryRoute("en", "BEN")}`,
      fr: `${BASE}${getCountryRoute("fr", "BEN")}`,
      "x-default": `${BASE}${getCountryRoute("en", "BEN")}`,
    });
    expect(metadata).not.toHaveProperty("robots");
  });

  // The parity read is keyed by the live identifier, never by the versioned
  // slug: a pinned revision has the translation its live fiche has.
  // @req REQ-141
  it("reads the parity of the live fiche, whatever the slug's version", async () => {
    await ficheCanonical("family", "en", "FLG_BANTU@v2");

    expect(ficheHasTranslationMock).toHaveBeenCalledWith(
      "family",
      "FLG_BANTU",
      "en"
    );
  });

  // @req REQ-141
  it("carries an Open Graph card in the locale the fiche was served in", async () => {
    const metadata = await ficheCanonical("language", "fr", "yor");

    expect(metadata.openGraph).toMatchObject({
      locale: "fr_FR",
      url: `${BASE}${getLanguageRoute("fr", "yor")}`,
    });
  });
});
