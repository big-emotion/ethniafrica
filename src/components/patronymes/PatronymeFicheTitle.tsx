import type { PublicPatronyme } from "@/api/v2/schemas/patronymes";
import { sourceStandingLabel } from "@/lib/glossaire/vocabularies";
import { readNameStanding, type NameStanding } from "@/lib/patronymes/content";
import { getTranslation } from "@/lib/translations";
import type { Language } from "@/types/shared";

type PatronymeCopy = ReturnType<typeof getTranslation>["patronymes"];

/** How many sources the fiche cites, and how many of those a machine wrote. */
function standingSentence(standing: NameStanding, t: PatronymeCopy): string {
  const count =
    standing.sourceCount === 1
      ? t.sourceStanding.countOne
      : t.sourceStanding.countMany.replace(
          "{count}",
          String(standing.sourceCount)
        );

  if (standing.aiGeneratedCount === 0) return `${count}.`;

  const aiShare =
    standing.aiGeneratedCount === 1
      ? t.sourceStanding.aiShareOne
      : t.sourceStanding.aiShareMany.replace(
          "{count}",
          String(standing.aiGeneratedCount)
        );

  return `${count}${aiShare}.`;
}

/**
 * The head of a patronyme fiche: what the name is, — AC1 — the naming system
 * it belongs to, stated in the header rather than left to the reader to infer
 * from which fields the dossier below happens to show, and what the fiche
 * rests on.
 *
 * The standing carries no percentage and no `ConfidenceChip`: DEC-050 rules
 * that a name has neither a confidence row nor a human-audit date, so a figure
 * here would be arithmetic on two terms that are zero by construction. The
 * tier word is only ever written when a citation claims it — a dossier citing
 * nothing readable says it is being assembled and stops there, because
 * defaulting to "Non vérifiée" would state a judgement nobody has made.
 */
// @req REQ-133
// @req REQ-147
export function PatronymeFicheTitle({
  patronyme,
  language,
}: {
  patronyme: PublicPatronyme;
  language: Language;
}) {
  const t = getTranslation(language).patronymes;
  const standing = readNameStanding(patronyme.content);
  const isAssembling = standing === null || standing.tier === "unverified";

  return (
    <header className="afh-parchment-head">
      <p className="afh-parchment-eyebrow">{t.eyebrow}</p>
      <h1>{patronyme.nameMain}</h1>
      <p className="afh-parchment-lede">
        {t.nameSystemStatementPrefix} {t.nameSystemLabels[patronyme.nameSystem]}
      </p>
      {standing !== null && (
        <p className="afh-parchment-note">
          <span className="afh-chip" data-tier={standing.tier}>
            {sourceStandingLabel(standing.tier, language)}
          </span>
          {/* SWC drops JSX whitespace across a line break — without this the
              chip and the sentence run together. */}
          {" " + standingSentence(standing, t)}
        </p>
      )}
      {isAssembling && (
        <p className="afh-parchment-note">{t.sourceStanding.assembling}</p>
      )}
    </header>
  );
}
