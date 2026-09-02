import type { Metadata } from "next";

import { NommerChapterPage } from "@/components/dossiers/nommer/NommerChapterPage";
import { getNommerChapter } from "@/lib/dossiers/nommer/chapters";
import { getNommerChapterRoute } from "@/lib/routing";

const CHAPTER = getNommerChapter("la-personne");

// @req REQ-113
export const metadata: Metadata = {
  title: CHAPTER.title,
  description: CHAPTER.standfirst.text,
  alternates: { canonical: getNommerChapterRoute("fr", "la-personne") },
};

// @req REQ-113
export default function NommerLaPersonnePage() {
  return <NommerChapterPage chapter={CHAPTER} />;
}
