"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/hooks/use-language";
import {
  getFamilyRoute,
  getLocalizedRoute,
  resolveFamilyDeepLink,
} from "@/lib/routing";
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
 *
 * The page frame is the Explorer layout's now: `FacetHubShell` owns the
 * `PageLayout`, the section name and the shared globe.
 */
// @req REQ-091
export function FamillesPageContent() {
  const { language } = useLanguage();
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
  //
  // Through the shared resolver, not by reading the query here: forwarding the
  // identifier raw made `?family=//host` an open redirect, which is the one
  // thing the country and people forms had already learnt not to do.
  useEffect(() => {
    const fiche = resolveFamilyDeepLink(language, searchParams);
    if (fiche) {
      router.replace(fiche);
    }
  }, [language, router, searchParams]);

  const openFamilyFiche = (family: LanguageFamilySummary) => {
    router.push(getFamilyRoute(language, family.id));
  };

  return (
    <DirectoryHero entityType="language-family" title={SECTION_NAME}>
      <LanguageFamilyView
        language={language}
        onFamilySelect={openFamilyFiche}
      />
    </DirectoryHero>
  );
}
