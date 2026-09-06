import { getLocalizedRoute } from "@/lib/routing";
import type { Metadata } from "next";
import { PageLayout } from "@/components/layout/PageLayout";
import { DossierDirectory } from "@/components/dossiers/DossierDirectory";
import { isLocale } from "@/lib/locale";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ lang: string }>;
}

async function resolvePage(params: Props["params"]) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return {
    language: lang,
    title: lang === "en" ? "The dossiers" : "Les dossiers",
    subtitle:
      lang === "en"
        ? "Subjects to explore across peoples, territories and eras."
        : "Des sujets à explorer à travers les peuples, les territoires et les époques.",
  };
}

// @req REQ-114 @req REQ-140
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await resolvePage(params);
  return {
    title: page.title,
    description: page.subtitle,
    alternates: { canonical: getLocalizedRoute(page.language, "dossiersHub") },
  };
}

// @req REQ-114 @req REQ-140
export default async function DossiersPage({ params }: Props) {
  const page = await resolvePage(params);
  return (
    <PageLayout {...page}>
      <DossierDirectory language={page.language} />
    </PageLayout>
  );
}
