import { getLocalizedRoute, translatePath } from "@/lib/routing";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DossierPage } from "@/components/dossiers/DossierPage";
import { getDossierBySlug, getDossierTranslation } from "@/lib/dossiers/corpus";
import { getPublishedLocales, isLocale } from "@/lib/locale";
import { localeHead } from "@/lib/seo/localeAlternates";
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
export async function generateMetadata({
  params,
}: DossierRouteProps): Promise<Metadata> {
  const { lang, dossier: slug } = await params;
  if (!isLocale(lang)) return {};
  const source = getDossierBySlug(slug);
  const translated = getDossierTranslation(slug);
  const dossier = lang === "en" ? (translated?.dossier ?? source) : source;

  if (!dossier) return {};

  const sourcePath = `${getLocalizedRoute("fr", "dossiersHub")}/${source?.slug ?? slug}`;

  return {
    title: dossier.title,
    description: dossier.standfirst,
    ...localeHead(
      lang,
      (language) => translatePath("fr", language, sourcePath),
      translated ? getPublishedLocales() : ["fr"],
      { title: dossier.title, description: dossier.standfirst }
    ),
  };
}

// @req REQ-113
export default async function DossierRoute({ params }: DossierRouteProps) {
  const { lang, dossier: slug } = await params;
  const translated = lang === "en" ? getDossierTranslation(slug) : null;
  const dossier = translated?.dossier ?? getDossierBySlug(slug);

  if (!dossier) notFound();

  return (
    <DossierPage
      dossier={dossier}
      language={lang as Language}
      translationState={
        lang === "en" ? (translated ? translated.kind : "missing") : undefined
      }
    />
  );
}
