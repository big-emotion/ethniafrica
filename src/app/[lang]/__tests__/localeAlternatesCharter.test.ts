/**
 * Every public page declares its locale alternates (REQ-141).
 *
 * The contract walks every `page.tsx` under `src/app/[lang]` — except the
 * authenticated console and the one-shot verification page, which are
 * nobody's to index — renders each page's `generateMetadata` in both
 * locales, and holds the result to the indexing doctrine in
 * `src/lib/seo/localeIndexing.ts`:
 *
 *   · an absolute canonical on the canonical domain, in the locale served;
 *   · for a surface at parity, both locales in the cluster and `x-default`
 *     on the English URL;
 *   · for a surface not yet at parity, and for every fiche until a
 *     translation record exists, French alone in the cluster and `noindex`
 *     under `/en`;
 *   · for a page indexed nowhere, a canonical and no cluster at all;
 *   · an Open Graph locale matching the page's.
 *
 * A page this file does not know is a failure, on purpose: a new route
 * registers itself here or ships without a head.
 */

import { readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import type { Metadata } from "next";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { CANONICAL_DOMAIN } from "@/lib/brand";
import { LOCALES } from "@/lib/locale";
import { OG_LOCALE_BY_LANGUAGE } from "@/lib/seo/localeAlternates";
import {
  surfaceIndexedLocales,
  type IndexedSurface,
} from "@/lib/seo/localeIndexing";
import type { Language } from "@/types/shared";

// Exercise the final two-locale launch state. Silent fr-only behaviour is
// covered independently in localeAlternates, localeIndexing and sitemap.
vi.stubEnv("SITE_LOCALE_MODE", "bilingual-en-default");

// Each fiche's `generateMetadata` also decides whether the entity exists,
// which is a database read. The stubs answer it so the walk never touches
// Supabase; what they answer with is what the fiche-seo baseline uses.
vi.mock("@/api/v2/services/countryService", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getCountryById: async (id: string) => ({ id, nameFr: id }),
}));

vi.mock("@/api/v2/services/peopleService", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getPeopleById: async (id: string) => ({ id, nameFr: id, nameMain: id }),
}));

vi.mock("@/api/v2/services/languageFamilyService", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getLanguageFamilyById: async (id: string) => ({ id, nameFr: id }),
}));

// The language fiche joined them when its head started naming the fiche
// (REQ-091): its `generateMetadata` read nothing before, so it was the one
// route here that reached Supabase for real.
vi.mock("@/api/v2/services/languageService", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getLanguageById: async (id: string) => ({
    id,
    name: id,
    family: { id: "FLG_TEST", name: "Bantou" },
    speakingPeoples: [],
  }),
}));

vi.mock("@/api/v2/services/patronymes", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getPatronymeById: async (id: string) => ({
    id,
    nameMain: id,
    nameSystem: "clan_name",
    casteOrSocialFunction: null,
    content: { sources: [{ title: "Bamadaba", tier: "referenced" }] },
    associatedPeoples: [],
    associatedCountries: [],
    bearers: [],
    alliances: [],
  }),
}));

vi.mock("@/api/v2/services/sources", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getSourceById: async () => null,
}));

vi.mock("@/lib/supabase/queries/afrik/translations", () => ({
  getAfrikTranslation: async () => null,
  getAfrikTranslationIds: async () => [],
}));

vi.mock("@/api/v2/handlers/compare", () => ({
  assembleComparison: async () => ({ ok: true, entities: [] }),
}));

vi.mock("@/lib/comparisonDataTransformer", () => ({
  transformComparisonData: () => ({
    columns: [{ label: "Yoruba" }, { label: "Zulu" }],
  }),
}));

vi.mock("@/api/v2/handlers/quiz", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  describeScope: async () => ({ labelFr: "Tout le corpus" }),
}));

// The doctrine article renders MDX through a server-only package with no
// runtime outside the Next build; its head never touches it.
vi.mock("next-mdx-remote/rsc", () => ({ MDXRemote: () => null }));
vi.mock("remark-gfm", () => ({ default: () => undefined }));

const ROUTES_ROOT = resolve(__dirname, "..");

/** Routes outside the contract: authenticated, or a one-shot token page. */
const OUTSIDE = [/^admin(\/|$)/, /^signalements\/verifier$/];

/**
 * Routes withdrawn with the dossiers freeze.
 *
 * They are outside the *indexing* contract because they are outside indexing
 * altogether: each answers 404 while its module is `draft`, and a canonical
 * on a page that does not resolve is an instruction to index a 404.
 *
 * Listed rather than pattern-matched, and asserted rather than merely skipped
 * — `withdrawn routes declare no head` below holds each one to emptiness. A
 * skip list nothing checks is how a route slips out of a contract for good.
 */
const WITHDRAWN = [
  "dossiers/[dossier]",
  "dossiers/migrations",
  "dossiers/nommer",
  "dossiers/nommer/la-chose",
  "dossiers/nommer/la-langue",
  "dossiers/nommer/la-personne",
  "dossiers/nommer/le-pays",
  "dossiers/nommer/le-peuple",
  "dossiers/regards/colonisation-et-resistances",
  "dossiers/themes/[theme]",
];

type Expectation =
  | { surface: IndexedSurface }
  // Indexed once a translation record exists for the entity — none today.
  | { surface: "fiche" }
  // Indexed in no locale: canonical only.
  | { surface: "unindexed" };

interface RouteFixture {
  params?: Record<string, string | string[]>;
  searchParams?: Record<string, string>;
  expectation: Expectation;
}

const SOURCE_UUID = "1f2c7c0e-6d0b-4e7f-9d1a-3b2c4d5e6f70";

/** Every page under `[lang]`, by its route directory, with what to call it with. */
const FIXTURES: Record<string, RouteFixture> = {
  "": { expectation: { surface: "home" } },
  about: { expectation: { surface: "about" } },
  accessibilite: { expectation: { surface: "accessibility" } },
  "atlas/appellations": { expectation: { surface: "names" } },
  "atlas/familles": { expectation: { surface: "families" } },
  "atlas/familles/[slug]": {
    params: { slug: "FLG_BANTU" },
    expectation: { surface: "fiche" },
  },
  "atlas/langues": { expectation: { surface: "languages" } },
  "atlas/langues/[slug]": {
    params: { slug: "yor" },
    expectation: { surface: "fiche" },
  },
  "atlas/noms": { expectation: { surface: "patronymes" } },
  "atlas/noms/[slug]": {
    params: { slug: "PAT_KEITA" },
    expectation: { surface: "fiche" },
  },
  "atlas/pays": { expectation: { surface: "countries" } },
  "atlas/pays/[slug]": {
    params: { slug: "BEN" },
    expectation: { surface: "fiche" },
  },
  "atlas/peuples": { expectation: { surface: "peoples" } },
  "atlas/peuples/[slug]": {
    params: { slug: "PPL_YORUBA" },
    expectation: { surface: "fiche" },
  },
  "atlas/peuples/[slug]/liens": {
    params: { slug: "PPL_YORUBA" },
    expectation: { surface: "fiche" },
  },
  "atlas/recherche": { expectation: { surface: "search" } },
  atlas: { expectation: { surface: "atlasHub" } },
  comparer: { expectation: { surface: "compare" } },
  "comparer/[entityType]/[...ids]": {
    params: { entityType: "peuples", ids: ["PPL_YORUBA", "PPL_ZULU"] },
    expectation: { surface: "unindexed" },
  },
  contact: { expectation: { surface: "contact" } },
  contribute: { expectation: { surface: "contribute" } },
  doctrine: { expectation: { surface: "doctrine" } },
  "doctrine/[slug]": {
    params: { slug: "classifications-contestees" },
    expectation: { surface: "doctrine" },
  },
  dossiers: { expectation: { surface: "dossiersHub" } },
  "dossiers/[dossier]": {
    params: { dossier: "royaume-kongo" },
    expectation: { surface: "dossierKongo" },
  },
  "dossiers/anecdotes": { expectation: { surface: "anecdotes" } },
  "dossiers/migrations": { expectation: { surface: "migrations" } },
  "dossiers/nommer": { expectation: { surface: "nommer" } },
  "dossiers/nommer/la-chose": { expectation: { surface: "nommer" } },
  "dossiers/nommer/la-langue": { expectation: { surface: "nommer" } },
  "dossiers/nommer/la-personne": { expectation: { surface: "nommer" } },
  "dossiers/nommer/le-pays": { expectation: { surface: "nommer" } },
  "dossiers/nommer/le-peuple": { expectation: { surface: "nommer" } },
  "dossiers/regards/colonisation-et-resistances": {
    expectation: { surface: "colonization" },
  },
  "dossiers/themes/[theme]": {
    params: { theme: "pouvoirs" },
    expectation: { surface: "dossierThemes" as IndexedSurface },
  },
  "fonds-decran": { expectation: { surface: "wallpapers" } },
  glossaire: { expectation: { surface: "glossary" } },
  jeux: { expectation: { surface: "jeuxHub" } },
  "jeux/[jeu]": {
    params: { jeu: "mercator" },
    expectation: { surface: "games" },
  },
  "jeux/quiz": { expectation: { surface: "quiz" } },
  "jeux/quiz/score": {
    searchParams: { mode: "aleatoire", correct: "5", total: "8" },
    expectation: { surface: "unindexed" },
  },
  "mentions-legales": { expectation: { surface: "legalNotice" } },
  "plan-du-site": { expectation: { surface: "sitemap" } },
  "politique-de-donnees": { expectation: { surface: "dataPolicy" } },
  "report-error": { expectation: { surface: "unindexed" } },
  signalements: { expectation: { surface: "reports" } },
  "signalements/[slug]": {
    params: { slug: "flag-abc123" },
    expectation: { surface: "reports" },
  },
  sources: { expectation: { surface: "sources" } },
  "sources/[id]": {
    params: { id: SOURCE_UUID },
    expectation: { surface: "unindexed" },
  },
};

function pageRoutes(directory = ROUTES_ROOT, found: string[] = []): string[] {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      pageRoutes(path, found);
    } else if (entry.name === "page.tsx") {
      found.push(relative(ROUTES_ROOT, directory));
    }
  }
  return found.sort();
}

const ALL_ROUTES = pageRoutes().filter(
  (route) => !OUTSIDE.some((pattern) => pattern.test(route))
);

const ROUTES = ALL_ROUTES.filter((route) => !WITHDRAWN.includes(route));

const BASE = `https://${CANONICAL_DOMAIN}`;

type RouteModule = {
  generateMetadata?: (props: {
    params: Promise<Record<string, string | string[]>>;
    searchParams: Promise<Record<string, string>>;
  }) => Promise<Metadata>;
};

// Loaded once, up front: the first import of a fiche route pulls its whole
// component tree through the transform, which under a loaded machine costs
// more than a single case's timeout. The cases then only render heads.
const ROUTE_MODULES = new Map<string, RouteModule>();

beforeAll(async () => {
  for (const route of ROUTES) {
    ROUTE_MODULES.set(
      route,
      await import(join(ROUTES_ROOT, route, "page.tsx"))
    );
  }
}, 120_000);

async function headOf(route: string, lang: Language) {
  const fixture = FIXTURES[route];
  const routeModule = ROUTE_MODULES.get(route);
  expect(
    typeof routeModule?.generateMetadata,
    `${route} exports no generateMetadata`
  ).toBe("function");

  return routeModule.generateMetadata({
    params: Promise.resolve({ lang, ...fixture.params }),
    searchParams: Promise.resolve(fixture.searchParams ?? {}),
  });
}

/** The locales the expectation says the page is indexed in. */
function indexedLocalesOf(expectation: Expectation): Language[] {
  if (expectation.surface === "unindexed") return [];
  if (expectation.surface === "fiche") return ["fr"];
  return surfaceIndexedLocales(expectation.surface);
}

describe("locale alternates — every public page", () => {
  // Measured over every route, withdrawn ones included: their fixtures stay
  // in the map on purpose, recording the head each one owes on the day it is
  // restored. Dropping them would make the restore a rediscovery.
  // @req REQ-141
  it("knows every page under [lang], so a new route cannot ship without a head", () => {
    expect(ALL_ROUTES).toEqual(Object.keys(FIXTURES).sort());
  });

  // The withdrawal list is a list of real routes, not of typos. A stale entry
  // would quietly excuse a route that no longer exists while some other one
  // ships headless.
  // @req REQ-141
  it("withdraws only routes that exist", () => {
    for (const route of WITHDRAWN) {
      expect(ALL_ROUTES, route).toContain(route);
    }
  });

  /**
   * A withdrawn route declares nothing: no canonical, no cluster, no title.
   *
   * Its `generateMetadata` either returns an empty head or calls `notFound()`
   * — which throws — and both are accepted here, because both mean the same
   * thing to a crawler. What is not accepted is a canonical, which would ask
   * the index to record a URL that answers 404.
   */
  // @req REQ-141
  it("gives a withdrawn route no head at all", async () => {
    for (const route of WITHDRAWN) {
      for (const lang of LOCALES) {
        const head = await headOf(route, lang).catch(() => null);
        if (head === null) continue;
        expect(head.alternates?.canonical, `${route} @${lang}`).toBeUndefined();
        expect(head.alternates?.languages, `${route} @${lang}`).toBeUndefined();
      }
    }
  }, 15_000);

  // Translation artifacts can be deployed before launch, but none of the 46
  // public routes may announce an English alternate while the gate is closed.
  // @req REQ-140
  // @req REQ-141
  it("announces no English alternate anywhere in fr-only mode", async () => {
    vi.stubEnv("SITE_LOCALE_MODE", "fr-only");
    try {
      for (const route of ROUTES) {
        for (const lang of LOCALES) {
          const languages = (await headOf(route, lang)).alternates?.languages;
          expect(languages?.en, route).toBeUndefined();
          if (languages?.fr) {
            expect(languages["x-default"], route).toBe(languages.fr);
          } else {
            expect(languages?.["x-default"], route).toBeUndefined();
          }
        }
      }
    } finally {
      vi.stubEnv("SITE_LOCALE_MODE", "bilingual-en-default");
    }
  }, 15_000);

  for (const route of ROUTES) {
    const fixture = FIXTURES[route];
    if (!fixture) continue;
    const indexed = indexedLocalesOf(fixture.expectation);

    describe(`/[lang]/${route}`, () => {
      for (const lang of LOCALES) {
        // @req REQ-141
        it(`declares an absolute canonical in ${lang}`, async () => {
          const head = await headOf(route, lang);
          const canonical = String(head.alternates?.canonical);

          expect(canonical.startsWith(`${BASE}/${lang}`)).toBe(true);
          expect(
            canonical === `${BASE}/${lang}` ||
              canonical.startsWith(`${BASE}/${lang}/`)
          ).toBe(true);
          expect(head.openGraph?.locale).toBe(OG_LOCALE_BY_LANGUAGE[lang]);
        });

        // @req REQ-141
        it(`clusters exactly the indexed locales when served in ${lang}`, async () => {
          const head = await headOf(route, lang);
          const languages = head.alternates?.languages ?? {};

          for (const locale of LOCALES) {
            expect(locale in languages, `${locale} in cluster`).toBe(
              indexed.includes(locale)
            );
          }
          if (indexed.includes("en")) {
            expect(languages["x-default"]).toBe(languages.en);
          } else {
            expect(languages).not.toHaveProperty("x-default");
          }
        });

        // @req REQ-141
        it(`${indexed.includes(lang) ? "is indexed" : "declares noindex"} in ${lang}`, async () => {
          const head = await headOf(route, lang);

          if (indexed.includes(lang)) {
            expect(head.robots ?? undefined).toBeUndefined();
          } else {
            expect(head.robots).toEqual({ index: false, follow: true });
          }
        });
      }
    });
  }
});
