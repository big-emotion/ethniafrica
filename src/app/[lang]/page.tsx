import type { Metadata } from "next";
import { PageLayout } from "@/components/layout/PageLayout";
import { HomeHero } from "@/components/home/HomeHero";
import { EntryPoints } from "@/components/home/EntryPoints";
import { getCorpusCounts } from "@/lib/home/corpusCounts";
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

// @req REQ-113
export default async function Home() {
  const counts = await getCorpusCounts();

  return (
    <PageLayout language="fr" hideHeader flushTop>
      <HomeHero />
      <div className="mt-8">
        <EntryPoints language="fr" counts={counts} />
      </div>
    </PageLayout>
  );
}
