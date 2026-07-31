/**
 * PeopleNamesSection — Epic 8 Story 8.9 (ETNI-473).
 *
 * Answers "who named this people, and what do they call themselves?"
 * (FR54, FR56) from the `names` payload threaded through the fiche's data
 * flow (`peopleDataTransformer.transformPeopleNames`). Endonym records
 * render first (the people's own autonym via `AutonymExonymHeading`
 * semantics, then one `NameOriginCard` per endonym record), imposed
 * exonyms carry their badge, full context and a `DoctrineLinkCard`, and
 * `NameSpellingHistory` closes the section. Renders nothing when there is
 * no `names` payload — no empty shell in SSR output (UX-DR31).
 */

import { AutonymExonymHeading } from "@/components/ui/AutonymExonymHeading";
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
  if (!data) return null;

  const { autonym, endonyms, exonyms, spellingHistory } = data;

  if (
    endonyms.length === 0 &&
    exonyms.length === 0 &&
    spellingHistory.length === 0
  ) {
    return null;
  }

  return (
    <section
      id="noms"
      aria-labelledby="noms-title"
      className="people-fade-in space-y-3 overflow-hidden rounded-[var(--country-radius-xl)] p-[18px] md:rounded-[20px] md:p-6 xl:rounded-[22px] xl:p-7"
      style={{
        background: "var(--country-card)",
        border: "1px solid var(--country-border)",
      }}
    >
      <h2
        id="noms-title"
        className="text-base font-bold text-[var(--country-text)] md:text-lg"
      >
        Noms &amp; appellations
      </h2>

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
