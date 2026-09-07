import { getLocalizedRoute } from "@/lib/routing";
import { surfaceHead } from "@/lib/seo/localeAlternates";
import type { Metadata } from "next";
import { PageLayout } from "@/components/layout/PageLayout";
import { DossierDirectory } from "@/components/dossiers/DossierDirectory";
import { getDossierIndexEntries } from "@/lib/dossiers/menu";
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
    ...surfaceHead(
      page.language,
      "dossiersHub",
      (language) => getLocalizedRoute(language, "dossiersHub"),
      { title: page.title, description: page.subtitle }
    ),
  };
}

// @req REQ-114 @req REQ-140
export default async function DossiersPage({ params }: Props) {
  const page = await resolvePage(params);
  return (
    <PageLayout {...page}>
      {/* Read here and handed down: the directory is a client component and
          the dossiers are files on disk. */}
      <DossierDirectory
        language={page.language}
        corpus={getDossierIndexEntries(page.language)}
      />
    </PageLayout>
  );
}
