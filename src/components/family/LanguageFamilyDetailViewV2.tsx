import { transformFamilyData } from "@/lib/familyDataTransformer";
import type { LanguageFamily } from "@/types/afrik";
import type { FamilyFootprintCountry } from "@/lib/atlas/overlays";
import type { MemberPeopleLike } from "@/lib/familyFootprintRanking";
import type { FamilyFootprintProvenance } from "@/lib/familyFootprintSource";
import { FamilyParchment } from "@/components/family/FamilyParchment";
import { FamilyHistorySection } from "@/components/family/FamilyHistorySection";
import { FamilyDecolonialHeader } from "@/components/family/FamilyDecolonialHeader";
import { FamilyLinguisticTraits } from "@/components/family/FamilyLinguisticTraits";

/**
 * The Record of a family fiche: the reading the globe band opens onto.
 *
 * The five sections are the fiche's opening argument: what it declares, what
 * it does not, and what can honestly be reconstructed around the gap. They
 * replace the general-info and distribution sections, whose content they carry
 * in full.
 *
 * Everything else the fiche holds is kept below them rather than dropped. The
 * mockup does not draw these because it models the five sections' argument,
 * not the fiche's whole contents, and "the mockup does not show it" is not a
 * reason to delete shipped content:
 *
 * Two things the mockup does not show are kept below them, because the mockup
 * models the Record's text and neither of these is text the five sections
 * carry:
 *
 * - The linguistic traits. TonguePanel above The Record is gated on the same
 *   field and normally carries them, but the Record must still stand on its
 *   own — it is rendered alone in stories and in tests.
 * - The decolonial header. The five sections quote one of its eleven fields,
 *   originOfHistoricalTerm, in a section of its own. The other ten — the
 *   historical appellations, why the term is problematic, the contemporary
 *   usage — are the fiche's decolonial posture, which is the point of the
 *   project; dropping them because the mockup did not draw them would be the
 *   single worst thing this refit could do.
 * - The history section, which owns the fiche's section-level FlagTarget
 *   (REQ-012 AC5, the reader's "report this section" affordance). Its content
 *   appears nowhere in the five, so keeping it duplicates nothing and dropping
 *   it would delete a requirement-backed capability this work was not asked to
 *   remove.
 * - The classification tree, which the route builds and hands in.
 *
 * The general-info and distribution sections are NOT kept: the five sections
 * carry their content in full, and rendering both would state the same figures
 * twice in two different shapes.
 *
 * One field is currently stated twice — originOfHistoricalTerm, quoted by the
 * third section and again inside the decolonial header below. That is the open
 * half of the mockup's own arbitrage on this section: it isolated the field
 * without deciding what became of the ten around it. Resolving it means either
 * teaching the header to omit the quoted field or folding the ten into the
 * five, and that is an editorial call, not a mechanical one.
 */
export interface LanguageFamilyDetailViewV2Props {
  family: LanguageFamily;
  /** Enables the live section FlagTarget on the history section (REQ-012 AC5). */
  /** The same countries, in the same order, the globe drew — so the ranking and the map cannot disagree. */
  footprintCountries?: readonly FamilyFootprintCountry[];
  memberPeoples?: readonly MemberPeopleLike[];
  memberPeopleCount?: number;
  /** Which rule built the footprint, so the parchment describes the one the page applied. */
  footprintProvenance?: FamilyFootprintProvenance;
}

// @req REQ-047
export function LanguageFamilyDetailViewV2({
  family,
  footprintCountries = [],
  memberPeoples = [],
  memberPeopleCount = 0,
  footprintProvenance = "member-peoples",
}: LanguageFamilyDetailViewV2Props) {
  const data = transformFamilyData(family);

  // Inside the parchment, not after it: these chapters used to follow the
  // sources footer, which made the fiche read as ending one chapter early.
  return (
    <FamilyParchment
      data={data}
      footprintCountries={footprintCountries}
      memberPeoples={memberPeoples}
      memberPeopleCount={memberPeopleCount}
      footprintProvenance={footprintProvenance}
    >
      <div className="afh-parchment-section">
        <FamilyDecolonialHeader data={data.decolonialHeader} />
      </div>
      <div className="afh-parchment-section">
        <FamilyLinguisticTraits data={data.linguisticTraits} />
      </div>
      <div className="afh-parchment-section">
        <FamilyHistorySection data={data.history} familyId={data.hero.id} />
      </div>
    </FamilyParchment>
  );
}
