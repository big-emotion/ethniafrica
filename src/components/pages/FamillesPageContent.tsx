"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/hooks/use-language";
import { getFamilyRoute, getLocalizedRoute } from "@/lib/routing";
import { PageLayout } from "@/components/layout/PageLayout";
import { LanguageFamilyView } from "@/components/views/LanguageFamilyView";
import { DirectoryHero } from "@/components/views/DirectoryHero";
import type { LanguageFamilySummary } from "@/types/afrik-frontend";

const SECTION_NAME = "Familles linguistiques";

/**
 * The families directory: a list that opens fiches, and nothing else.
 *
 * It used to be a master-detail — picking a family set `?family=<id>` and
 * rendered a tabbed detail in place, a second family rendering competing with
 * the charter fiche at `/fr/familles/<id>`. Nothing gated the two apart, so
 * every route into a family from here missed the globe entirely.
 */
// @req REQ-091
export function FamillesPageContent() {
  const { language, setLanguage } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const expected = getLocalizedRoute(language, "families");
    if (pathname !== expected) {
      router.replace(expected);
    }
  }, [language, pathname, router]);

  // `?family=<id>` addressed the retired detail-beside-the-list view. Bookmarks
  // and inbound links still carrying it are forwarded to the fiche rather than
  // silently dropped onto an undifferentiated directory.
  useEffect(() => {
    const bookmarkedFamily = searchParams.get("family");
    if (bookmarkedFamily) {
      router.replace(getFamilyRoute(language, bookmarkedFamily));
    }
  }, [language, router, searchParams]);

  const openFamilyFiche = (family: LanguageFamilySummary) => {
    router.push(getFamilyRoute(language, family.id));
  };

  return (
    <PageLayout
      language={language}
      onLanguageChange={setLanguage}
      sectionName={SECTION_NAME}
      hideHeader
    >
      <DirectoryHero entityType="language-family" title={SECTION_NAME}>
        <LanguageFamilyView
          language={language}
          onFamilySelect={openFamilyFiche}
        />
      </DirectoryHero>
    </PageLayout>
  );
}
