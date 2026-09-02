/**
 * PeopleNamesSection — Epic 8 Story 8.9 (ETNI-473).
 *
 * Answers "who named this people, and what do they call themselves?"
 * (FR54, FR56) from the `names` payload threaded through the fiche's data
 * flow (`peopleDataTransformer.transformPeopleNames`). Endonym records
 * render first (the people's own autonym via `AutonymExonymHeading`
 * semantics, then one `NameOriginCard` per endonym record), imposed
 * exonyms carry their badge, full context and a `DoctrineLinkCard`, and
 * `NameSpellingHistory` closes the section.
 *
 * The chapter is printed whether or not the corpus fills it. `appellations`
 * is the first chapter of `public/modele-peuple.json`, so atlas charter §4
 * governs it: an empty chapter of the model is a fact about the corpus and
 * says so, rather than vanishing. UX-DR31's "no empty shell" rule still holds
 * for blocks the model does not declare — that is what a `not-modelled`
 * resolution is for — but it cannot cover a chapter the model does declare.
 *
 * This is also where an ethnonym's imposition context lands. The grouped
 * `/fr/atlas/appellations` listing drops `meaning`, `period_label`,
 * `imposition_period` and `contemporary_usage` on the stated grounds that
 * "the fiche is where the full imposition context belongs" — this section is
 * that fiche, and `NameOriginCard` already renders all four. Hiding it when
 * empty is what left that deferral pointing at nothing.
 */

import { AutonymExonymHeading } from "@/components/ui/AutonymExonymHeading";
import { FieldProvenanceMarker } from "@/components/fiche/FieldProvenanceMarker";
import { NameOriginCard } from "@/components/names/NameOriginCard";
import { NameSpellingHistory } from "@/components/names/NameSpellingHistory";
import { ConfidenceChip } from "@/components/source-transparency/ConfidenceChip";
import { DoctrineLinkCard } from "@/components/source-transparency/DoctrineLinkCard";
import type {
  PeopleNamesData,
  PeopleNameRecordViewData,
} from "@/lib/peopleDataTransformer";

export interface PeopleNamesSectionProps {
  data: PeopleNamesData | null;
}

function chipFor(entry: {
  confidenceScore: number | null;
  sourceCount: number;
  lastHumanAuditAt: string | null;
}) {
  return (
    <ConfidenceChip
      confidenceScore={entry.confidenceScore}
      sourceCount={entry.sourceCount}
      lastHumanAuditAt={entry.lastHumanAuditAt}
    />
  );
}

function NameEntry({ entry }: { entry: PeopleNameRecordViewData }) {
  return (
    <NameOriginCard record={entry.record} confidenceChip={chipFor(entry)} />
  );
}

// @req REQ-054 REQ-056
export function PeopleNamesSection({ data }: PeopleNamesSectionProps) {
  const autonym = data?.autonym ?? null;
  const endonyms = data?.endonyms ?? [];
  const exonyms = data?.exonyms ?? [];
  const spellingHistory = data?.spellingHistory ?? [];

  const isEmpty =
    endonyms.length === 0 &&
    exonyms.length === 0 &&
    spellingHistory.length === 0 &&
    !autonym;

  return (
    <section
      id="noms"
      data-fiche-section="Noms & appellations"
      aria-labelledby="noms-title"
      className="people-fade-in space-y-3 overflow-hidden rounded-[var(--country-radius-xl)] p-[18px] md:rounded-[20px] md:p-6 xl:rounded-[22px] xl:p-7"
      style={{
        background: "var(--country-card)",
        border: "1px solid var(--country-border)",
      }}
    >
      <h2
        id="noms-title"
        className="text-afh-small font-bold text-[var(--country-text)]"
      >
        Noms &amp; appellations
      </h2>

      {isEmpty && <FieldProvenanceMarker state="missing" />}

      {autonym && <AutonymExonymHeading variant="card" autonym={autonym} />}

      {endonyms.map((entry, index) => (
        <NameEntry key={`endonym-${index}`} entry={entry} />
      ))}

      {exonyms.map((entry, index) => (
        <div key={`exonym-${index}`} className="space-y-2">
          <NameEntry entry={entry} />
          {entry.record.imposedBy && (
            <DoctrineLinkCard slug="endonymes-vs-exonymes" />
          )}
        </div>
      ))}

      <NameSpellingHistory
        spellings={spellingHistory.map((entry) => ({
          nameText: entry.nameText,
          periodLabel: entry.periodLabel,
          confidenceChip: chipFor(entry),
        }))}
      />
    </section>
  );
}

export default PeopleNamesSection;
