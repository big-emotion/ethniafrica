import type { Metadata } from "next";
import { PageLayout } from "@/components/layout/PageLayout";
import { HomeHero } from "@/components/home/HomeHero";
import { TrustStrip } from "@/components/home/TrustStrip";
import { FeaturedModule } from "@/components/home/FeaturedModule";
import { DidYouKnow } from "@/components/home/DidYouKnow";
import { pickDidYouKnowFact } from "@/lib/home/didYouKnowFacts";
import { getModulesByAxis } from "@/lib/home/accessAxesData";
import { loadSeedWords } from "@/lib/home/seedWords";
import { getContinentPeopleCounts } from "@/api/v2/services/continentPeopleCounts";
import {
  DEFAULT_HERO_MODULE_ID,
  pickHeroModule,
} from "@/lib/home/heroRotation";
import { loadHeroPreview } from "@/lib/home/heroPreviewData";
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

interface HomeProps {
  searchParams: Promise<{ hero?: string | string[] }>;
}

// @req REQ-113
// @req REQ-115
export default async function Home({ searchParams }: HomeProps) {
  const [{ hero }, modulesByAxis, peopleCountsByCountry, seedWords] =
    await Promise.all([
      searchParams,
      getModulesByAxis(),
      // The continent scene's own signal, for whichever module the slot draws.
      // Caught like the explorer hub catches it: a failed count costs the
      // scene's per-country field, not the page.
      getContinentPeopleCounts().catch(() => undefined),
      // Ten names per chip, drawn from the corpus for this reader — the hero's
      // module is not the only thing this page draws per request.
      loadSeedWords(),
    ]);

  // Drawn per request, like the hero's module and for the same reason: the
  // draw runs in a server component, so it never re-runs during hydration
  // and cannot desynchronise the client tree.
  const didYouKnowFact = pickDidYouKnowFact();

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
      <HomeHero seedWords={seedWords} />
      <DidYouKnow language="fr" fact={didYouKnowFact} />
      <FeaturedModule
        heroModule={heroModule}
        heroPreview={heroPreview}
        peopleCountsByCountry={peopleCountsByCountry}
      />
      <TrustStrip language="fr" />
    </PageLayout>
  );
}
