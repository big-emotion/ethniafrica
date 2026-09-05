import type { Metadata } from "next";

import {
  NOMMER_PAGE_SUBTITLE,
  NOMMER_PAGE_TITLE,
  NommerPillarPage,
} from "@/components/dossiers/nommer/NommerPillarPage";
import { getLocalizedRoute } from "@/lib/routing";
import type { Language } from "@/types/shared";

interface PageProps {
  params: Promise<{ lang: string }>;
}

// @req REQ-113
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { lang } = await params;
  return {
    title: NOMMER_PAGE_TITLE,
    description: NOMMER_PAGE_SUBTITLE,
    alternates: { canonical: getLocalizedRoute(lang as Language, "nommer") },
  };
}

/**
 * The pillar of the founding dossier.
 *
 * It renders from a constant, like `dossiers/anecdotes`: the corpus behind it
 * is the repository rather than a table, so nothing here awaits a query and
 * the page cannot show a reader an empty dossier because a database was slow.
 */
// @req REQ-113
export default async function NommerPage({ params }: PageProps) {
  const { lang } = await params;
  return <NommerPillarPage language={lang as Language} />;
}
