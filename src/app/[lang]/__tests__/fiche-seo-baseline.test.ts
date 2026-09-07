/**
 * SEO baseline for the three fiche routes (peuples / pays / familles).
 *
 * The earlier version of this file froze the *absence* of route-level
 * metadata, and said in as many words that a story adding canonicals had to
 * rewrite it in the same commit. Lot 3's PR3 is that story: nesting the
 * modules under their hub gives every fiche a second address for as long as
 * the 308s stand, and a redirect window without canonicals is exactly the
 * window in which the duplicate gets indexed instead of the original.
 *
 * So the assertions have flipped for `generateMetadata` and stayed put for
 * everything else. Each route declares what `ficheCanonical` composes: the
 * canonical, and since REQ-141 the hreflang cluster, the robots directive and
 * the Open Graph card that follow the locales the fiche is indexed in.
 *
 * The per-entity title and the structured data this file used to hold open as
 * "later work" arrived on 2026-09-07, and rewrote the two assertions that were
 * guarding the decision — which is what those assertions were for. Production
 * had been serving the root layout's title on all 3 242 sitemap URLs, and
 * Google had sent 12 visitors in the site's lifetime. `ficheHead` composes the
 * title now; `FicheJsonLd` emits the graph from the shell rather than from
 * each route, so a route cannot forget it.
 *
 * What the head says is `ficheCanonical`'s business, and its own suite's
 * (src/lib/seo/__tests__/ficheCanonical.test.ts) — including the part that
 * is easy to get wrong twice, that a pinned `@v3` points at the live fiche
 * rather than at itself.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";

// next/font/google ships an empty runtime module: the real loader is a
// compile-time transform that exists only inside the Next.js build. Importing
// the root layout outside that build therefore needs the loaders stubbed.
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

// Each fiche's `generateMetadata` now also decides whether the entity exists,
// because `loading.tsx` makes the segment a Suspense boundary and the page
// body's own `notFound()` arrives after the 200 is already on the wire. That
// check is a database read, so this baseline has to answer it — without these
// mocks the four canonical assertions hang until the 5s timeout rather than
// failing on anything meaningful. The name route joined them under REQ-147,
// which reads the dossier a second time to decide whether to declare noindex.
vi.mock("@/api/v2/services/countryService", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getCountryById: async (id: string) => ({ id, nameFr: id }),
}));

vi.mock("@/api/v2/services/peopleService", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getPeopleById: async (id: string) => ({ id, nameFr: id }),
}));

vi.mock("@/api/v2/services/languageFamilyService", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getLanguageFamilyById: async (id: string) => ({ id, nameFr: id }),
}));

// Cites a referenced source so the fiche is one the sitemap keeps: this
// baseline asserts canonicals, and a dossier left unsourced would drag the
// noindex branch of REQ-147 into a test that is not about it.
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

import { metadata as rootLayoutMetadata } from "@/app/layout";
import { CANONICAL_DOMAIN, OG_DESCRIPTION } from "@/lib/brand";
import {
  getCountryRoute,
  getFamilyRoute,
  getPatronymeRoute,
  getPeopleRoute,
} from "@/lib/routing";
import * as peuplesFicheRoute from "../atlas/peuples/[slug]/page";
import * as paysFicheRoute from "../atlas/pays/[slug]/page";
import * as famillesFicheRoute from "../atlas/familles/[slug]/page";
import * as patronymeFicheRoute from "../atlas/noms/[slug]/page";

const FICHE_ROUTES = [
  {
    segment: "peuples",
    routeModule: peuplesFicheRoute,
    sourcePath: "src/app/[lang]/atlas/peuples/[slug]/page.tsx",
    canonical: getPeopleRoute("fr", "PPL_YORUBA"),
    slug: "PPL_YORUBA",
  },
  {
    segment: "pays",
    routeModule: paysFicheRoute,
    sourcePath: "src/app/[lang]/atlas/pays/[slug]/page.tsx",
    canonical: getCountryRoute("fr", "BEN"),
    slug: "BEN",
  },
  {
    segment: "familles",
    routeModule: famillesFicheRoute,
    sourcePath: "src/app/[lang]/atlas/familles/[slug]/page.tsx",
    canonical: getFamilyRoute("fr", "FLG_BANTU"),
    slug: "FLG_BANTU",
  },
  {
    segment: "noms",
    routeModule: patronymeFicheRoute,
    sourcePath: "src/app/[lang]/atlas/noms/[slug]/page.tsx",
    canonical: getPatronymeRoute("fr", "PAT_KEITA"),
    slug: "PAT_KEITA",
  },
] as const;

describe("fiche routes — the crawler-facing surface", () => {
  for (const {
    segment,
    routeModule,
    sourcePath,
    canonical,
    slug,
  } of FICHE_ROUTES) {
    describe(`/[lang]/${segment}/[slug]`, () => {
      // @req REQ-091
      it("declares its canonical, and declares it absolute", async () => {
        const metadata = await routeModule.generateMetadata({
          params: Promise.resolve({ lang: "fr", slug }),
        });

        expect(metadata.alternates?.canonical).toBe(
          `https://${CANONICAL_DOMAIN}${canonical}`
        );
      });

      // In the fail-closed publication mode, the cluster holds the French
      // address as both `fr` and `x-default`; English is withheld regardless
      // of any translation records already prepared (REQ-140, REQ-141).
      // @req REQ-141
      it("clusters French alone and withholds its English address from the index", async () => {
        const french = await routeModule.generateMetadata({
          params: Promise.resolve({ lang: "fr", slug }),
        });
        const english = await routeModule.generateMetadata({
          params: Promise.resolve({ lang: "en", slug }),
        });

        expect(Object.keys(french.alternates?.languages ?? {})).toEqual([
          "fr",
          "x-default",
        ]);
        expect(french.robots).toBeUndefined();
        expect(english.robots).toEqual({ index: false, follow: true });
        expect(english.alternates?.languages).not.toHaveProperty("en");
      });

      // The head is still composed per request, never declared statically: a
      // static `metadata` export cannot name the entity the slug resolves to.
      // @req REQ-019
      it("adds no static metadata beside the canonical", () => {
        expect(Object.keys(routeModule)).not.toContain("metadata");
      });

      /**
       * The decision this baseline was holding open. Until 2026-09-07 the
       * assertion here was that the head named nothing — all 3 242 sitemap
       * URLs served the root layout's title, and Google had sent 12 visitors
       * in the site's lifetime. `ficheHead` now composes a title from the
       * fiche; what this pins is that it can never silently go back to the
       * site-wide one.
       */
      // @req REQ-091
      it("names the fiche rather than inheriting the site-wide title", async () => {
        const metadata = await routeModule.generateMetadata({
          params: Promise.resolve({ lang: "fr", slug }),
        });

        expect(typeof metadata.title).toBe("string");
        expect(metadata.title).not.toBe(rootLayoutMetadata.title);
        expect(metadata.description).not.toBe(rootLayoutMetadata.description);
      });

      /**
       * `FicheJsonLd` is awaited, so it cannot be mounted in `FicheSequence`:
       * an async child would make the shared shell async and every synchronous
       * render of it — the accent-scope and one-globe-one-parchment suites
       * included — resolve to nothing. The routes are already async server
       * components, so the mount lives there and this assertion is what stops
       * one of the five from quietly going missing from the graph.
       */
      // @req REQ-091
      it("mounts the structured data its shell cannot", () => {
        const routeSource = readFileSync(
          resolve(process.cwd(), sourcePath),
          "utf8"
        );

        expect(routeSource).toContain("<FicheJsonLd");
        // The markup itself stays in the component, not inlined per route.
        expect(routeSource).not.toContain("ld+json");
      });

      // @req REQ-019
      it("revalidates hourly, so a crawler never sees a page more than an hour stale", () => {
        expect(routeModule.revalidate).toBe(3600);
      });
    });
  }
});

describe("root layout metadata — the only <head> the fiche routes get", () => {
  // @req REQ-019
  it("matches the pre-swap baseline", () => {
    expect(rootLayoutMetadata).toEqual({
      // metadataBase derives from NEXT_PUBLIC_SITE_URL and so differs per
      // environment; only its shape is frozen here, and the guarantee that
      // actually matters is asserted below.
      metadataBase: expect.any(URL),
      title: "EthniAfrica | Dictionnaire des Ethnies d'Afrique",
      // Present and a string, not a frozen sentence. What the description has
      // to *say* is siteDescription.test.ts's contract, derived from the module
      // registry — pinning the copy in a second suite is what let it name four
      // of the six corpus classes while two suites stayed green.
      description: expect.any(String),
      authors: [{ name: "EthniAfrica" }],
      icons: {
        icon: "/favicon.ico",
        apple: "/favicon.ico",
      },
      openGraph: {
        // The site's own title, qualified: a social card carries no masthead
        // beside it to say what EthniAfrica is.
        title: "EthniAfrica — Atlas des Peuples d'Afrique",
        // Read from the constant rather than copied: what is asserted here is
        // that the layout wires the site's one OG description, not what that
        // sentence happens to say today.
        description: OG_DESCRIPTION,
        type: "website",
        images: ["/opengraph-image"],
      },
      twitter: {
        card: "summary_large_image",
        site: "@big_emotion",
        images: ["/twitter-image"],
      },
    });
  });

  // The layout sits above `[lang]` and cannot know which locale a page was
  // served in, so it declares no alternates and no Open Graph locale: those
  // are every page's own, through `localeHead`, and a page's nested
  // `openGraph` replaces the layout's wholesale — which is why the helper
  // carries the whole card rather than the locale alone.
  // @req REQ-141
  it("leaves the locale-bound head to the pages", () => {
    expect(rootLayoutMetadata).not.toHaveProperty("alternates");
    expect(rootLayoutMetadata.openGraph).not.toHaveProperty("locale");
  });

  // @req REQ-019
  it("resolves its relative OG and Twitter image paths against an absolute origin", () => {
    expect(rootLayoutMetadata.metadataBase).toBeInstanceOf(URL);
    expect(String(rootLayoutMetadata.metadataBase)).toMatch(/^https?:\/\//);
  });
});
