/**
 * Pre-swap SEO baseline for the three fiche routes (peuples / pays / familles).
 *
 * ETNI-928/929/930 rebuild what these routes render. None of that work is meant
 * to move the crawler-facing surface, but swapping a render tree is exactly the
 * kind of change that silently drops a JSON-LD block or shifts which module
 * owns the page <head>. Freezing the surface here forces the swap to prove it
 * left SEO alone.
 *
 * That surface is thinner than one might assume, and these assertions encode
 * the fact rather than an aspiration: the three fiche routes export no
 * `metadata` and no `generateMetadata`, emit no JSON-LD, and inherit their
 * entire <head> from the static `metadata` in src/app/layout.tsx — which
 * declares no canonical at all. Other routes do own metadata
 * (src/app/[lang]/page.tsx, src/app/[lang]/signalements/[slug]/page.tsx), so
 * the absence is a property of the fiche routes, not of the app.
 *
 * A later story giving the fiche routes per-entity titles, canonicals or
 * structured data is legitimate and expected — it must rewrite this baseline
 * deliberately, in the same commit that adds them.
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

import { metadata as rootLayoutMetadata } from "@/app/layout";
import * as peuplesFicheRoute from "../peuples/[slug]/page";
import * as paysFicheRoute from "../pays/[slug]/page";
import * as famillesFicheRoute from "../familles/[slug]/page";

const FICHE_ROUTES = [
  {
    segment: "peuples",
    routeModule: peuplesFicheRoute,
    sourcePath: "src/app/[lang]/peuples/[slug]/page.tsx",
  },
  {
    segment: "pays",
    routeModule: paysFicheRoute,
    sourcePath: "src/app/[lang]/pays/[slug]/page.tsx",
  },
  {
    segment: "familles",
    routeModule: famillesFicheRoute,
    sourcePath: "src/app/[lang]/familles/[slug]/page.tsx",
  },
] as const;

describe("fiche routes — SEO baseline frozen before the ETNI-817 panel swap", () => {
  for (const { segment, routeModule, sourcePath } of FICHE_ROUTES) {
    describe(`/[lang]/${segment}/[slug]`, () => {
      // @req REQ-019
      it("owns no route-level metadata and leaves the whole <head> to the root layout", () => {
        expect(Object.keys(routeModule)).not.toContain("metadata");
        expect(Object.keys(routeModule)).not.toContain("generateMetadata");
      });

      // @req REQ-019
      it("emits no structured data", () => {
        const routeSource = readFileSync(
          resolve(process.cwd(), sourcePath),
          "utf8"
        );

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
      title: "Atlas des Peuples d'Afrique | Dictionnaire des Ethnies d'Afrique",
      description:
        "Encyclopédie des peuples, langues et familles linguistiques dans les 55 pays africains. Explorez la diversité culturelle et linguistique du continent.",
      authors: [{ name: "Atlas des Peuples d'Afrique" }],
      icons: {
        icon: "/favicon.ico",
        apple: "/favicon.ico",
      },
      openGraph: {
        title: "Atlas des Peuples d'Afrique",
        description:
          "Encyclopédie des peuples, langues et familles linguistiques d'Afrique",
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

  // @req REQ-019
  it("resolves its relative OG and Twitter image paths against an absolute origin", () => {
    expect(rootLayoutMetadata.metadataBase).toBeInstanceOf(URL);
    expect(String(rootLayoutMetadata.metadataBase)).toMatch(/^https?:\/\//);
  });
});
