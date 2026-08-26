import { AutonymExonymHeading } from "@/components/ui/AutonymExonymHeading";

/**
 * "Le nom porté, les noms subis" — the fiche's opening section.
 *
 * It comes before any figure because it is the editorial position stated in
 * one object: the autonym and the imposed names both present, neither hidden
 * and neither passed off as the neutral one. Erasing colonial-era names would
 * erase the record of what was done; printing them plain would ratify it.
 *
 * The layout itself belongs to AutonymExonymHeading, which is what carries the
 * autonym's `lang` attribute and what afh/no-bare-people-name points every
 * name through. This section owns the surrounding prose and the conditionals
 * the corpus imposes, not the pairing.
 */
// @req REQ-115
export function PeopleNamingBlock({
  nameMain,
  selfAppellation,
  exonyms,
  whyProblematic,
  isoCode,
}: {
  nameMain: string;
  selfAppellation?: string | null;
  exonyms?: string[] | null;
  whyProblematic?: string | null;
  isoCode?: string;
}) {
  return (
    <div className="flex flex-col gap-afh-sm">
      <AutonymExonymHeading
        variant="people-naming"
        nameMain={nameMain}
        autonym={selfAppellation ?? nameMain}
        autonymIso639_3={isoCode}
        exonyms={exonyms ?? []}
      />

      {/* 316 of the corpus's 789 fiches carry no whyProblematic. Rendering the
          lead-in unconditionally would announce an explanation and then give
          none, on 40 % of the corpus. */}
      {whyProblematic && (
        <p className="text-afh-small">
          <strong>Pourquoi ces noms posent problème.</strong> {whyProblematic}
        </p>
      )}
    </div>
  );
}
