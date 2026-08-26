import type { Metadata } from "next";
import { PageLayout } from "@/components/layout/PageLayout";
import { HomeHero } from "@/components/home/HomeHero";
import { AccessAxes } from "@/components/home/AccessAxes";
import { TrustStrip } from "@/components/home/TrustStrip";
import { getCorpusCounts } from "@/lib/home/corpusCounts";
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

// @req REQ-113
export default async function Home() {
  const counts = await getCorpusCounts();

  return (
    // navOnNight: the nav is the top of the hero band, not a parchment
    // strip above it — the sky has to start at the top of the page.
    <PageLayout language="fr" hideHeader flushTop navOnNight>
      <HomeHero />
      <section className="home-axes-section">
        <AccessAxes language="fr" counts={counts} />
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
