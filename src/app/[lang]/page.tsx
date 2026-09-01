import type { Metadata } from "next";
import { PageLayout } from "@/components/layout/PageLayout";
import { HomeHero } from "@/components/home/HomeHero";
import { HomeCorpusCounts } from "@/components/home/HomeCorpusCounts";
import { DidYouKnow } from "@/components/home/DidYouKnow";
import { pickDidYouKnowFacts } from "@/lib/home/didYouKnowFacts";
import { getCorpusCounts } from "@/lib/home/corpusCounts";
import { loadSeedWords } from "@/lib/home/seedWords";
import { drawHomeHeroVisual } from "@/lib/home/homeHeroVisuals";
import { getContinentPeopleCounts } from "@/api/v2/services/continentPeopleCounts";
import { OG_TITLE, OG_DESCRIPTION } from "@/lib/brand";

/**
 * The home draws two sourced facts on every request (REQ-115), so it must not
 * be prerendered. The root layout currently awaits connection() for the CSP
 * nonce, but that is action at a distance: stating the contract here keeps a
 * future middleware change from freezing the pair forever.
 *
 * This is the opposite failure to the one staticParamsBan.test.ts guards:
 * there a route claimed to be static and answered 500 at request time;
 * here a route that is dynamic only by inheritance would answer 200 with
 * the same fact forever.
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

// @req REQ-113
// @req REQ-115
export default async function Home() {
  // Drawn on the server once per request: no hydration mismatch and no visual
  // swap after the first paint. The force-dynamic contract above prevents the
  // result from being frozen into a prerendered page.
  const heroVisual = drawHomeHeroVisual();

  const [counts, peopleCountsByCountry, seedWords] = await Promise.all([
    // A failed total read is not an empty corpus. The counter component says
    // it is unavailable instead of turning an operational failure into zero.
    getCorpusCounts().catch(() => null),
    // The shared globe owns its own unavailable state: losing its country
    // signal must not take the search or the rest of the hero with it.
    heroVisual.kind === "globe"
      ? getContinentPeopleCounts().catch(() => undefined)
      : Promise.resolve(undefined),
    loadSeedWords(),
  ]);

  // Drawn in the server component so it never re-runs during hydration and
  // cannot desynchronise the client tree.
  const didYouKnowFacts = pickDidYouKnowFacts(2);

  return (
    <PageLayout language="fr" hideHeader flushTop flushBottom>
      <HomeHero
        seedWords={seedWords}
        peopleCountsByCountry={peopleCountsByCountry}
        counts={<HomeCorpusCounts counts={counts} />}
        visual={heroVisual}
      />
      <DidYouKnow language="fr" facts={didYouKnowFacts} />
    </PageLayout>
  );
}
