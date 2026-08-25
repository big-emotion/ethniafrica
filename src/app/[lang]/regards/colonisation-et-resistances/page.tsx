/**
 * `/fr/regards/colonisation-et-resistances` — Epic 13, Story 13.9 (ETNI-533).
 * French-only doctrine-bound module page (FR90): no locale alternates, and
 * no children-facing surface links here (asserted in
 * `src/lib/__tests__/colonizationChildrenExclusion.test.tsx`).
 *
 * `listPeopleFragmentations` reuses the Story 13.7 per-people service over a
 * bounded candidate sweep — there is no bulk fragmentation endpoint yet.
 * Later sections (map, imposed names, displacement, resistances) stay
 * gracefully omitted until Stories 13.8/13.10/13.11/13.12 land.
 */

import type { Metadata } from "next";
import { ColonizationModulePage } from "@/components/colonization/ColonizationModulePage";
import { transformColonizationModuleData } from "@/lib/colonizationDataTransformer";
import { listPeopleFragmentations } from "@/api/v2/services/peopleFragmentation";
import { translations } from "@/lib/translations";

const t = translations.fr.colonization;

const CANONICAL_PATH = "/fr/regards/colonisation-et-resistances";

// @req FR90
export const metadata: Metadata = {
  title: t.pageTitle,
  description: t.pageSubtitle,
  alternates: {
    canonical: CANONICAL_PATH,
  },
};

async function loadColonizationPageData() {
  const fragmentations = await listPeopleFragmentations();
  return transformColonizationModuleData({ fragmentations });
}

// @req FR90
export default async function ColonizationPage() {
  const data = await loadColonizationPageData();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: t.pageTitle,
    description: t.pageSubtitle,
    inLanguage: "fr",
    url: CANONICAL_PATH,
  };

  return (
    <>
      {}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ColonizationModulePage data={data} />
    </>
  );
}
