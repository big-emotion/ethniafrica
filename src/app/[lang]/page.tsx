import type { Metadata } from "next";
import { PageLayout } from "@/components/layout/PageLayout";
import { HomeHero } from "@/components/home/HomeHero";
import { HubCard } from "@/components/home/HubCard";
import { getVisibleAccessModeHubs } from "@/lib/accessModeHubs";
import { OG_TITLE, OG_DESCRIPTION } from "@/lib/brand";

// @req FR95
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

// @req FR91 @req FR92 @req FR95
export default function Home() {
  const visibleHubs = getVisibleAccessModeHubs("fr");

  return (
    <PageLayout language="fr" hideHeader>
      <HomeHero />
      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        {visibleHubs.map((hub) => (
          <HubCard key={hub.id} hub={hub} />
        ))}
      </div>
    </PageLayout>
  );
}
