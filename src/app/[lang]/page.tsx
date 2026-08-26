import type { Metadata } from "next";
import { PageLayout } from "@/components/layout/PageLayout";
import { HomeHero } from "@/components/home/HomeHero";
import { AccessAxes } from "@/components/home/AccessAxes";
import { TrustStrip } from "@/components/home/TrustStrip";
import { getCorpusCounts } from "@/lib/home/corpusCounts";
import { getHubModules, type HubModule } from "@/lib/hubs/moduleAvailability";
import { ACCESS_MODES, type AccessMode } from "@/lib/hubs/moduleRegistry";
import { OG_TITLE, OG_DESCRIPTION } from "@/lib/brand";

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

// @req REQ-113
export default async function Home() {
  const [counts, modulesByAxis] = await Promise.all([
    getCorpusCounts(),
    getModulesByAxis(),
  ]);

  return (
    <PageLayout language="fr" hideHeader flushTop>
      <HomeHero />
      <section className="home-axes-section" aria-label="Les trois axes">
        <AccessAxes
          language="fr"
          counts={counts}
          modulesByAxis={modulesByAxis}
        />
      </section>
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
