import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { NommerChapterPage } from "@/components/dossiers/nommer/NommerChapterPage";
import { isModulePublished } from "@/lib/hubs/moduleOffer";
import { getNommerChapter } from "@/lib/dossiers/nommer/chapters";
import { localizeNommerChapter } from "@/lib/dossiers/nommer/localizeChapter";
import { getNommerChapterRoute } from "@/lib/routing";
import { surfaceHead } from "@/lib/seo/localeAlternates";
import type { Language } from "@/types/shared";

const CHAPTER = getNommerChapter("le-peuple");

interface PageProps {
  params: Promise<{ lang: string }>;
}

// @req REQ-113
// @req REQ-141
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { lang } = await params;
  if (!isModulePublished("nommer")) return {};
  const chapter = localizeNommerChapter(CHAPTER, lang as Language);
  const copy = { title: chapter.title, description: chapter.standfirst.text };
  return {
    ...copy,
    ...surfaceHead(
      lang as Language,
      "nommer",
      (locale) => getNommerChapterRoute(locale, "le-peuple"),
      copy
    ),
  };
}

/**
 * A static directory rather than a slug of a `[chapitre]` route.
 *
 * Five directories cost five twelve-line files, and they let each chapter
 * carry its own metadata without a lookup.
 *
 * The wait screen that used to sit at `dossiers/nommer` is gone, and its
 * absence is now load-bearing: this route answers 404 while the dossier is
 * withdrawn, and `loaderCoverage.test.ts` forbids a boundary above a route
 * that can. Restoring the dossier means restoring that `loading.tsx` too.
 */
// @req REQ-113
export default async function NommerLePeuplePage({ params }: PageProps) {
  const { lang } = await params;
  if (!isModulePublished("nommer")) notFound();
  return <NommerChapterPage chapter={CHAPTER} language={lang as Language} />;
}
