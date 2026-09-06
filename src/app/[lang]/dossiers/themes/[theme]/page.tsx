import { isLocale } from "@/lib/locale";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageLayout } from "@/components/layout/PageLayout";
import { DossierDirectory } from "@/components/dossiers/DossierDirectory";
import { getPublishedThemes } from "@/lib/dossiers/catalog";
import { getDossierThemeHref } from "@/lib/dossiers/themes";

interface Props {
  params: Promise<{ lang: string; theme: string }>;
}

async function resolveTheme(params: Props["params"]) {
  const { theme, lang } = await params;
  if (!isLocale(lang)) notFound();
  const result = getPublishedThemes(undefined, lang).find(
    (candidate) => candidate.id === theme
  );
  if (!result) notFound();
  return { ...result, language: lang };
}

// @req REQ-114
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const theme = await resolveTheme(params);
  return {
    title: theme.label,
    description: theme.description,
    alternates: { canonical: getDossierThemeHref(theme.id, theme.language) },
  };
}

// @req REQ-114
export default async function DossierThemePage({ params }: Props) {
  const theme = await resolveTheme(params);
  return (
    <PageLayout
      language={theme.language}
      title={theme.label}
      subtitle={theme.description}
      trailLabel={theme.label}
    >
      <DossierDirectory
        key={theme.id}
        theme={theme.id}
        language={theme.language}
      />
    </PageLayout>
  );
}
