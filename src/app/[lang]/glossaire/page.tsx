import type { Metadata } from "next";

import {
  GLOSSARY_PAGE_SUBTITLE,
  GLOSSARY_PAGE_TITLE,
  GlossaryPage,
} from "@/components/glossaire/GlossaryPage";
import { getLocalizedRoute } from "@/lib/routing";

const CANONICAL_PATH = getLocalizedRoute("fr", "glossary");

// @req REQ-144
export const metadata: Metadata = {
  title: GLOSSARY_PAGE_TITLE,
  description: GLOSSARY_PAGE_SUBTITLE,
  alternates: { canonical: CANONICAL_PATH },
};

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
export default function GlossairePage() {
  return <GlossaryPage />;
}
