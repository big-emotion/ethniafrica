import type { Metadata } from "next";
import { PageLayout } from "@/components/layout/PageLayout";
import { HomeHero } from "@/components/home/HomeHero";
import { ModuleGrid } from "@/components/home/ModuleGrid";
import { getHomeModules } from "@/lib/accessModeHubs";
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
  const modules = getHomeModules("fr");

  return (
    <PageLayout language="fr" hideHeader>
      <HomeHero />
      <div className="mt-8">
        <ModuleGrid modules={modules} />
      </div>
    </PageLayout>
  );
}
