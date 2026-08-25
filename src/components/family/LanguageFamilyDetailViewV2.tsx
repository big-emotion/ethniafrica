import {
  transformFamilyData,
  type FamilyPageData,
} from "@/lib/familyDataTransformer";
import type { ReactNode } from "react";
import type { LanguageFamily } from "@/types/afrik";
import { FamilyDecolonialHeader } from "@/components/family/FamilyDecolonialHeader";
import { FamilyDistributionSection } from "@/components/family/FamilyDistributionSection";
import { FamilyGeneralInfoSection } from "@/components/family/FamilyGeneralInfoSection";
import { FamilyHero } from "@/components/family/FamilyHero";
import { FamilyHistorySection } from "@/components/family/FamilyHistorySection";
import { FamilyLinguisticTraits } from "@/components/family/FamilyLinguisticTraits";
import { FamilySourcesFooter } from "@/components/family/FamilySourcesFooter";

export interface LanguageFamilyDetailViewV2Props {
  family: LanguageFamily;
  classificationTree?: ReactNode;
  /** Cloudflare Turnstile public site key, required to enable the live FlagTarget wiring on section headings (AC5). */
  turnstileSiteKey?: string;
}

function FamilySections({
  data,
  classificationTree,
  turnstileSiteKey,
}: {
  data: FamilyPageData;
  classificationTree?: ReactNode;
  turnstileSiteKey?: string;
}) {
  return (
    <div className="space-y-4">
      <FamilyDecolonialHeader data={data.decolonialHeader} />
      <FamilyGeneralInfoSection data={data.generalInfo} />
      <FamilyLinguisticTraits data={data.linguisticTraits} />
      <FamilyHistorySection
        data={data.history}
        familyId={data.hero.id}
        turnstileSiteKey={turnstileSiteKey}
      />
      <FamilyDistributionSection data={data.distribution} />
      {classificationTree}
      <FamilySourcesFooter sources={data.sources} />
    </div>
  );
}

// @req REQ-047
export function LanguageFamilyDetailViewV2({
  family,
  classificationTree,
  turnstileSiteKey,
}: LanguageFamilyDetailViewV2Props) {
  const data = transformFamilyData(family);

  return (
    <main className="mx-auto w-full max-w-[800px] space-y-4 px-3 py-3 md:px-4 md:py-4 xl:px-5 xl:py-5">
      <FamilyHero data={data.hero} />
      <FamilySections
        data={data}
        classificationTree={classificationTree}
        turnstileSiteKey={turnstileSiteKey}
      />
    </main>
  );
}
