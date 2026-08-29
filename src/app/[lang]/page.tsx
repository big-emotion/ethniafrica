import type { Metadata } from "next";
import { PageLayout } from "@/components/layout/PageLayout";
import { HomeHero } from "@/components/home/HomeHero";
import { AccessAxes } from "@/components/home/AccessAxes";
import { TrustStrip } from "@/components/home/TrustStrip";
import { PurposeBlocks } from "@/components/home/PurposeBlocks";
import { FeaturedModule } from "@/components/home/FeaturedModule";
import { DidYouKnow } from "@/components/home/DidYouKnow";
import { SynthesisRail } from "@/components/home/SynthesisRail";
import { orderDidYouKnowDeck } from "@/lib/home/didYouKnowFacts";
import { loadSynthesisRail } from "@/lib/home/synthesisRailData";
import { getCorpusCounts } from "@/lib/home/corpusCounts";
import {
  DEFAULT_HERO_MODULE_ID,
  pickHeroModule,
} from "@/lib/home/heroRotation";
import { loadHeroPreview } from "@/lib/home/heroPreviewData";
import { getHubModules, type HubModule } from "@/lib/hubs/moduleAvailability";
import { ACCESS_MODES, type AccessMode } from "@/lib/hubs/moduleRegistry";
import { OG_TITLE, OG_DESCRIPTION } from "@/lib/brand";

/**
 * The hero draws a different module on every request (REQ-115), so the home
 * must not be prerendered. Reading searchParams below already forces that,
 * and so does the root layout awaiting connection() for the CSP nonce — but
 * both are action at a distance. Stating it here means the day that nonce
 * moves into middleware alone, the hero does not silently freeze on one
 * module chosen at build time with nothing failing.
 *
 * This is the opposite failure to the one staticParamsBan.test.ts guards:
 * there a route claimed to be static and answered 500 at request time;
 * here a route that is dynamic only by inheritance would answer 200 with
 * the same module forever.
 */
// @req REQ-115
export const dynamic = "force-dynamic";

// @req REQ-044 FR95
export const metadata: Metadata = {
  title: OG_TITLE,
  description: OG_DESCRIPTION,
  alternates: {
    canonical: "/fr",
  },
  openGraph: {
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    type: "website",
    url: "/fr",
  },
};

/**
 * The modules behind all three axes, resolved server-side (REQ-114). The
 * home now opens its axis panels in place, so the reader must not wait on
 * a Supabase round trip after the click — and the availability probe,
 * which counts rows in the corpus tables, has no business running in the
 * browser. getHubModules already caches each data-source probe for 60 s,
 * so these three calls cost at most one query per backing table per
 * minute, whatever the traffic.
 */
async function getModulesByAxis(): Promise<Record<AccessMode, HubModule[]>> {
  const entries = await Promise.all(
    ACCESS_MODES.map(async (mode) => [mode, await getHubModules(mode)] as const)
  );
  return Object.fromEntries(entries) as Record<AccessMode, HubModule[]>;
}

interface HomeProps {
  searchParams: Promise<{ hero?: string | string[] }>;
}

// @req REQ-113
// @req REQ-115
export default async function Home({ searchParams }: HomeProps) {
  const [{ hero }, counts, modulesByAxis, syntheses] = await Promise.all([
    searchParams,
    getCorpusCounts(),
    getModulesByAxis(),
    loadSynthesisRail(),
  ]);

  // Drawn per request, like the hero's module and for the same reason: the
  // draw runs in a server component, so it never re-runs during hydration
  // and cannot desynchronise the client tree.
  const didYouKnowDeck = orderDidYouKnowDeck();

  // The band opens on the globe, every time.
  //
  // It used to draw uniformly from the three heroable modules, on the reading
  // that variation shows the atlas holds more than one. It does not read that
  // way: a reader who arrives twice sees two different sites, and one who
  // arrives once has no way to know the band is a sample at all. Until the
  // band says what it is, showing the same thing is the honest default.
  //
  // ?hero=<moduleId> still forces another module — the visual snapshot, the
  // deep link and design review all need it. Repeated params collapse to the
  // first rather than throwing: a hand-edited URL should not 500.
  const requestedPin = Array.isArray(hero) ? hero[0] : hero;
  const pin = requestedPin ?? DEFAULT_HERO_MODULE_ID;
  const heroModule = pickHeroModule(modulesByAxis, { pin });
  // Only the drawn module is resolved, never the whole lot: the slot shows
  // one module, so loading the other eighteen would be eighteen wasted
  // round trips per request.
  const heroPreview = heroModule ? await loadHeroPreview(heroModule) : null;

  return (
    <PageLayout language="fr" hideHeader flushTop>
      <HomeHero />
      {/* The doors first, then argument, proof and sample.
          They used to come last, on the reading that a reader who has not
          been told what the atlas is for cannot choose between Explorer,
          Comprendre and Jouer. The hero's standfirst now does that telling
          in two sentences, above the fold — so the reader who already knows
          where they are going is no longer made to scroll past four sections
          to find the way in, and the one who does not still meets the
          argument immediately below. */}
      <section className="home-axes-section">
        <AccessAxes
          language="fr"
          counts={counts}
          modulesByAxis={modulesByAxis}
        />
      </section>
      <PurposeBlocks language="fr" />
      <DidYouKnow language="fr" facts={didYouKnowDeck} />
      <SynthesisRail language="fr" syntheses={syntheses} />
      {/* Where the axes used to stand. The module is the page's invitation
          to do something rather than read something, which lands better
          after the atlas has shown what it holds than before. */}
      <FeaturedModule heroModule={heroModule} heroPreview={heroPreview} />
      <TrustStrip language="fr" />
      <style>{`
        .home-axes-section {
          background: var(--afh-bg);
          padding: 40px 24px 60px;
          width: 100vw;
          margin-left: calc(50% - 50vw);
          margin-right: calc(50% - 50vw);
        }
        @media (max-width: 700px) {
          .home-axes-section { padding: 30px 20px 44px; }
        }
      `}</style>
    </PageLayout>
  );
}
