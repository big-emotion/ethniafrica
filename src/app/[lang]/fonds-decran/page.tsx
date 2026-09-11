import type { Metadata } from "next";

import { WallpaperLibraryPage } from "@/components/pages/WallpaperLibraryPage";
import { scaleLadder } from "@/lib/i18n/copy/scaleLadder";
import { getLocalizedRoute } from "@/lib/routing";
import { surfaceHead } from "@/lib/seo/localeAlternates";
import type { Language } from "@/types/shared";

interface PageProps {
  params: Promise<{ lang: string }>;
}

// @req REQ-141
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { lang } = await params;
  const ladder = scaleLadder[lang as Language];
  const copy = { title: ladder.title, description: ladder.reframe };

  return {
    ...copy,
    ...surfaceHead(
      lang as Language,
      "wallpapers",
      (locale) => getLocalizedRoute(locale, "wallpapers"),
      copy
    ),
  };
}

/**
 * The wallpaper library sits at the root, on no axis.
 *
 * It describes the project rather than the corpus, and no access mode lists
 * it, so filing it under one would invent an ancestor the menu never offers —
 * the same reason `about`, `doctrine`, `sources` and the glossary carry no
 * prefix.
 *
 * Static: the ladder is six hand-written rungs, not a corpus query. The
 * figures inside them were measured against the corpus and are stated with
 * their provenance rather than recomputed per request, which is what lets a
 * downloaded image stay true to the page that sourced it.
 */
// @req REQ-132
export default async function WallpapersPage({ params }: PageProps) {
  const { lang } = await params;
  return <WallpaperLibraryPage language={lang as Language} />;
}
