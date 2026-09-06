import type { Metadata } from "next";

import { NommerChapterPage } from "@/components/dossiers/nommer/NommerChapterPage";
import { getNommerChapter } from "@/lib/dossiers/nommer/chapters";
import { localizeNommerChapter } from "@/lib/dossiers/nommer/localizeChapter";
import { getNommerChapterRoute } from "@/lib/routing";
import { surfaceHead } from "@/lib/seo/localeAlternates";
import type { Language } from "@/types/shared";

const CHAPTER = getNommerChapter("la-langue");

interface PageProps {
  params: Promise<{ lang: string }>;
}

// @req REQ-113
// @req REQ-141
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { lang } = await params;
  const chapter = localizeNommerChapter(CHAPTER, lang as Language);
  const copy = { title: chapter.title, description: chapter.standfirst.text };
  return {
    ...copy,
    ...surfaceHead(
      lang as Language,
      "nommer",
      (locale) => getNommerChapterRoute(locale, "la-langue"),
      copy
    ),
  };
}

// @req REQ-113
export default async function NommerLaLanguePage({ params }: PageProps) {
  const { lang } = await params;
  return <NommerChapterPage chapter={CHAPTER} language={lang as Language} />;
}
