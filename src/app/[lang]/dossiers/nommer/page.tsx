import type { Metadata } from "next";

import {
  NOMMER_PAGE_SUBTITLE,
  NOMMER_PAGE_TITLE,
  NommerPillarPage,
} from "@/components/dossiers/nommer/NommerPillarPage";
import { getLocalizedRoute } from "@/lib/routing";

const CANONICAL_PATH = getLocalizedRoute("fr", "nommer");

// @req REQ-113
export const metadata: Metadata = {
  title: NOMMER_PAGE_TITLE,
  description: NOMMER_PAGE_SUBTITLE,
  alternates: { canonical: CANONICAL_PATH },
};

/**
 * The pillar of the founding dossier.
 *
 * It renders from a constant, like `dossiers/anecdotes`: the corpus behind it
 * is the repository rather than a table, so nothing here awaits a query and
 * the page cannot show a reader an empty dossier because a database was slow.
 */
// @req REQ-113
export default function NommerPage() {
  return <NommerPillarPage />;
}
