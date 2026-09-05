import type { Metadata } from "next";

import { NommerChapterPage } from "@/components/dossiers/nommer/NommerChapterPage";
import { getNommerChapter } from "@/lib/dossiers/nommer/chapters";
import { getNommerChapterRoute } from "@/lib/routing";
import type { Language } from "@/types/shared";

const CHAPTER = getNommerChapter("la-personne");

interface PageProps {
  params: Promise<{ lang: string }>;
}

// @req REQ-113
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { lang } = await params;
  return {
    title: CHAPTER.title,
    description: CHAPTER.standfirst.text,
    alternates: {
      canonical: getNommerChapterRoute(lang as Language, "la-personne"),
    },
  };
}

// @req REQ-113
export default async function NommerLaPersonnePage({ params }: PageProps) {
  const { lang } = await params;
  return <NommerChapterPage chapter={CHAPTER} language={lang as Language} />;
}
