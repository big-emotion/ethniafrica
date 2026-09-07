import { afterEach, describe, expect, it, vi } from "vitest";

import { CANONICAL_DOMAIN } from "@/lib/brand";
import { LOCALES } from "@/lib/locale";
import { getLocalizedRoute } from "@/lib/routing";
import {
  OG_LOCALE_BY_LANGUAGE,
  localeHead,
  localeOpenGraph,
  pageAlternates,
} from "@/lib/seo/localeAlternates";
import type { Language } from "@/types/shared";

/**
 * The hreflang cluster, as REQ-141 registers it: both locales, `x-default`
 * on the English URL, every address absolute on the canonical domain.
 *
 * The cluster follows what is indexed, not what exists: a locale whose page
 * declares `noindex` is dropped from every other locale's cluster, because
 * a search engine discards a cluster that points at a page it may not index
 * — and the French twin would lose its alternates for the English page's
 * fault.
 */

const BASE = `https://${CANONICAL_DOMAIN}`;
const peoplesFacet = (lang: Language) => getLocalizedRoute(lang, "peoples");

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("pageAlternates", () => {
  // @req REQ-141
  it("declares both locales and x-default on the English URL when both are indexed", () => {
    vi.stubEnv("SITE_LOCALE_MODE", "bilingual-en-default");
    const alternates = pageAlternates("fr", peoplesFacet, LOCALES);

    expect(alternates).toEqual({
      canonical: `${BASE}${peoplesFacet("fr")}`,
      languages: {
        en: `${BASE}${peoplesFacet("en")}`,
        fr: `${BASE}${peoplesFacet("fr")}`,
        "x-default": `${BASE}${peoplesFacet("en")}`,
      },
    });
  });

  // The launch gate owns the default. Preparing English must not change the
  // unprefixed French destination or advertise English as the default early.
  // @req REQ-140
  // @req REQ-141
  it("keeps x-default on French in French-default publication modes", () => {
    vi.stubEnv("SITE_LOCALE_MODE", "bilingual-fr-default");

    expect(pageAlternates("fr", peoplesFacet, LOCALES).languages).toEqual({
      en: `${BASE}${peoplesFacet("en")}`,
      fr: `${BASE}${peoplesFacet("fr")}`,
      "x-default": `${BASE}${peoplesFacet("fr")}`,
    });
  });

  // Callers may know content parity but publication remains the final gate.
  // @req REQ-140
  // @req REQ-141
  it("drops English even when a caller offers it while fr-only", () => {
    vi.stubEnv("SITE_LOCALE_MODE", "fr-only");

    expect(pageAlternates("fr", peoplesFacet, LOCALES).languages).toEqual({
      fr: `${BASE}${peoplesFacet("fr")}`,
      "x-default": `${BASE}${peoplesFacet("fr")}`,
    });
  });

  // The root layout's metadataBase falls back to localhost:3000, and a
  // canonical resolved against it is worse than none.
  // @req REQ-141
  it("addresses every url absolutely, on the canonical domain", () => {
    const alternates = pageAlternates("en", peoplesFacet, LOCALES);
    const urls = [
      alternates.canonical,
      ...Object.values(alternates.languages ?? {}),
    ];

    expect(urls.length).toBeGreaterThan(1);
    for (const url of urls) {
      expect(String(url).startsWith(`${BASE}/`)).toBe(true);
    }
  });

  // @req REQ-141
  it("keeps the canonical on the locale the page was served in", () => {
    expect(pageAlternates("en", peoplesFacet, LOCALES).canonical).toBe(
      `${BASE}${peoplesFacet("en")}`
    );
    expect(pageAlternates("fr", peoplesFacet, LOCALES).canonical).toBe(
      `${BASE}${peoplesFacet("fr")}`
    );
  });

  // @req REQ-141
  it("drops an unpublished locale and keeps x-default on the published French page", () => {
    vi.stubEnv("SITE_LOCALE_MODE", "fr-only");
    const alternates = pageAlternates("fr", peoplesFacet, ["fr"]);

    expect(alternates.languages).toEqual({
      fr: `${BASE}${peoplesFacet("fr")}`,
      "x-default": `${BASE}${peoplesFacet("fr")}`,
    });
    expect(alternates.languages).not.toHaveProperty("en");
  });

  // A page kept out of the index everywhere — a source, a comparison, a
  // score card — still has to say which address it is the duplicate of.
  // @req REQ-141
  it("declares a canonical and nothing else when no locale is indexed", () => {
    expect(pageAlternates("en", peoplesFacet, [])).toEqual({
      canonical: `${BASE}${peoplesFacet("en")}`,
    });
  });

  // @req REQ-141
  it("composes every address through the caller's path function", () => {
    const seen: Language[] = [];
    pageAlternates(
      "en",
      (lang) => {
        seen.push(lang);
        return `/${lang}/x`;
      },
      LOCALES
    );

    expect(seen).toEqual(expect.arrayContaining([...LOCALES]));
  });
});

describe("localeOpenGraph", () => {
  // @req REQ-141
  it("names the locale in Open Graph form, British English for en", () => {
    expect(OG_LOCALE_BY_LANGUAGE).toEqual({ en: "en_GB", fr: "fr_FR" });
  });

  // Nested metadata is replaced wholesale by the last segment to define it,
  // so a page declaring only `openGraph.locale` would drop the site card the
  // root layout gave it. The helper therefore returns the whole object.
  // @req REQ-141
  it("carries the site card, the page's url and the locale pair", () => {
    vi.stubEnv("SITE_LOCALE_MODE", "bilingual-fr-default");
    const alternates = pageAlternates("fr", peoplesFacet, LOCALES);
    const openGraph = localeOpenGraph("fr", alternates, {
      title: "Peuples",
      description: "Les peuples du corpus.",
    });

    expect(openGraph).toEqual({
      title: "Peuples",
      description: "Les peuples du corpus.",
      type: "website",
      images: ["/opengraph-image"],
      url: `${BASE}${peoplesFacet("fr")}`,
      locale: "fr_FR",
      alternateLocale: ["en_GB"],
    });
  });

  // @req REQ-141
  it("lists no alternate locale the cluster does not carry", () => {
    const alternates = pageAlternates("en", peoplesFacet, ["en"]);

    expect(localeOpenGraph("en", alternates).alternateLocale).toEqual([]);
  });
});

describe("localeHead", () => {
  // @req REQ-141
  it("says noindex, follow only for a locale outside the indexed set", () => {
    const indexed = localeHead("fr", peoplesFacet, ["fr"]);
    const withheld = localeHead("en", peoplesFacet, ["fr"]);

    expect(indexed).not.toHaveProperty("robots");
    expect(withheld.robots).toEqual({ index: false, follow: true });
  });

  // @req REQ-140
  // @req REQ-141
  it("withholds English when publication is closed even if parity is offered", () => {
    vi.stubEnv("SITE_LOCALE_MODE", "fr-only");

    expect(localeHead("en", peoplesFacet, LOCALES).robots).toEqual({
      index: false,
      follow: true,
    });
  });

  // @req REQ-141
  it("binds the alternates and the Open Graph card to the same address", () => {
    const head = localeHead("en", peoplesFacet, LOCALES, { title: "Peoples" });

    expect(head.openGraph?.url).toBe(head.alternates?.canonical);
    expect(head.openGraph?.locale).toBe("en_GB");
    expect(head.openGraph?.title).toBe("Peoples");
  });
});
