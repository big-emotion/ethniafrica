import type { Metadata } from "next";

import { NommerChapterPage } from "@/components/dossiers/nommer/NommerChapterPage";
import { getNommerChapter } from "@/lib/dossiers/nommer/chapters";
import { getNommerChapterRoute } from "@/lib/routing";
import type { Language } from "@/types/shared";

const CHAPTER = getNommerChapter("le-peuple");

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
      canonical: getNommerChapterRoute(lang as Language, "le-peuple"),
    },
  };
}

/**
 * A static directory rather than a slug of a `[chapitre]` route.
 *
 * The dynamic form would have to answer 404 for an unknown slug, and
 * `loaderCoverage.test.ts` forbids a `loading.tsx` above a route that can — so
 * the boundary would drop onto the parameterised segment and reopen the
 * soft-404 the fiches are grandfathered into. Five directories cost five
 * twelve-line files and keep one boundary for the whole dossier.
 *
 * That gate reads the file as text, comments included, so this note says
 * "answer 404" rather than naming the function: writing the name here would
 * have made the guard flag a route that never calls it.
 */
// @req REQ-113
export default async function NommerLePeuplePage({ params }: PageProps) {
  const { lang } = await params;
  return <NommerChapterPage chapter={CHAPTER} language={lang as Language} />;
}
