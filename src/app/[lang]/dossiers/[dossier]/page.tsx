import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DossierPage } from "@/components/dossiers/DossierPage";
import { getDossierBySlug, listDossiers } from "@/lib/dossiers/corpus";
import type { Language } from "@/types/shared";

interface DossierRouteProps {
  params: Promise<{ lang: string; dossier: string }>;
}

/**
 * Every dossier of the Réalités vertical, on one page component.
 *
 * A dynamic segment rather than one directory per dossier, because the brief
 * this surface answers to is "one dossier page, not several": a static
 * directory per subject is exactly how the axis forked the first time, with
 * four dossiers composing four different documents.
 *
 * The Nommer pillar keeps its own static directory alongside this one, and
 * Next resolves the static segment first, so /fr/dossiers/nommer is untouched.
 * That is deliberate: Nommer's five chapters are five routes of their own,
 * which a single-page dossier is not.
 *
 * **No loading.tsx here, and it is not an oversight.** This route can call
 * notFound(), and loaderCoverage.test.ts forbids a wait screen above a route
 * that can — a loading boundary over a 404 renders the frame of a page that is
 * not going to exist, which search engines read as a soft 404.
 */
// @req REQ-113
export async function generateStaticParams() {
  return listDossiers("realites").map((dossier) => ({ dossier: dossier.slug }));
}

// @req REQ-113
export async function generateMetadata({
  params,
}: DossierRouteProps): Promise<Metadata> {
  const { lang, dossier: slug } = await params;
  const dossier = getDossierBySlug(slug);

  if (!dossier) return {};

  return {
    title: dossier.title,
    description: dossier.standfirst,
    alternates: { canonical: `/${lang}/dossiers/${dossier.slug}` },
  };
}

// @req REQ-113
export default async function DossierRoute({ params }: DossierRouteProps) {
  const { lang, dossier: slug } = await params;
  const dossier = getDossierBySlug(slug);

  if (!dossier) notFound();

  return <DossierPage dossier={dossier} language={lang as Language} />;
}
