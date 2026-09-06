import type { Metadata } from "next";

import { GlossaryPage } from "@/components/glossaire/GlossaryPage";
import { GLOSSARY_ENTRIES } from "@/lib/glossaire/entries";
import { glossaryPageCopy } from "@/lib/i18n/copy/glossaryPage";
import { getLocalizedRoute } from "@/lib/routing";
import { surfaceHead } from "@/lib/seo/localeAlternates";
import type { Language } from "@/types/shared";

interface PageProps {
  params: Promise<{ lang: string }>;
}

// @req REQ-144
// @req REQ-141
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { lang } = await params;
  const language = lang as Language;
  const pageCopy = glossaryPageCopy[language];
  const copy = {
    title: pageCopy.title,
    description: pageCopy.subtitle(GLOSSARY_ENTRIES.length),
  };
  return {
    ...copy,
    ...surfaceHead(
      lang as Language,
      "glossary",
      (locale) => getLocalizedRoute(locale, "glossary"),
      copy
    ),
  };
}

/**
 * The glossary sits at the root, on no axis.
 *
 * It serves the atlas and the games as much as the dossiers — Appellations
 * shows *endonyme* to a reader, the fiches use *contested*, and a chapter
 * links a term inline — so filing it under one access mode would invent an
 * ancestor the menu never offers. `about`, `doctrine` and `sources` carry no
 * prefix for exactly this reason, and it is reached from the same footer
 * rubric.
 */
// @req REQ-144
export default async function GlossairePage({ params }: PageProps) {
  const { lang } = await params;
  return <GlossaryPage language={lang as Language} />;
}
