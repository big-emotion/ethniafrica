import type { PublicPatronyme } from "@/api/v2/schemas/patronymes";
import { FicheSection } from "@/components/fiche/FicheSection";
import { FieldProvenanceMarker } from "@/components/fiche/FieldProvenanceMarker";
import {
  readGaps,
  readOrigin,
  type OriginAccount,
} from "@/lib/patronymes/content";
import { resolveChapter } from "@/lib/fieldProvenance";
import { translations } from "@/lib/translations";

const t = translations.fr.patronymes;

/**
 * Where a name is said to come from.
 *
 * Three parallel lists rather than one classified origin, because that is
 * what the corpus writes and what the subject needs: a griot's telling and a
 * colonial chronicle are two testimonies about the same name, and ranking one
 * as *the* origin would decide by format what the sources leave open.
 *
 * An oral tradition is presented as a transcription with its griot named,
 * never as a bare fact — a fiche that dropped that attribution would make a
 * griot's account read as the corpus's own claim.
 *
 * The section is printed whether or not the corpus fills it (atlas charter
 * §4). It used to return null on a shape mismatch, which removed it from the
 * page *and* from the chapter rail — the rail reads its entries from the
 * rendered DOM, so the omission hid its own evidence.
 */
// @req REQ-133
export function PatronymeOriginSection({
  patronyme,
}: {
  patronyme: PublicPatronyme;
}) {
  const origin = readOrigin(patronyme.content);
  const gaps = readGaps(patronyme.content);

  const strands: Array<{ label: string; accounts: OriginAccount[] }> = [
    { label: t.originOralTraditionsLabel, accounts: origin.oralTraditions },
    {
      label: t.originWrittenChroniclesLabel,
      accounts: origin.writtenChronicles,
    },
    {
      label: t.originLinguisticReconstructionsLabel,
      accounts: origin.linguisticReconstructions,
    },
  ].filter((strand) => strand.accounts.length > 0);

  const chapter = resolveChapter(
    "name",
    "origin",
    strands.length > 0 ? strands : null,
    gaps
  );

  return (
    <FicheSection title={t.originTitle}>
      {strands.length > 0 ? (
        strands.map((strand) => (
          <div key={strand.label}>
            <h3>{strand.label}</h3>
            <ul>
              {strand.accounts.map((account) => (
                <li key={account.claim}>
                  {account.claim}
                  {account.claimStatus ? (
                    <> — {t.originClaimStatusLabels[account.claimStatus]}</>
                  ) : null}
                  {account.griot ? (
                    <>
                      {" "}
                      {t.griotAttributionPrefix} {account.griot}.
                    </>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ))
      ) : (
        <FieldProvenanceMarker state={chapter.state} reason={chapter.reason} />
      )}
      {origin.oralTraditions.length > 0 ? (
        <p className="afh-parchment-note">{t.griotOriginNote}</p>
      ) : null}
    </FicheSection>
  );
}

export default PatronymeOriginSection;
