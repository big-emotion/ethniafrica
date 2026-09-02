import type { PublicPatronyme } from "@/api/v2/schemas/patronymes";
import { translations } from "@/lib/translations";

const t = translations.fr.patronymes;

/**
 * The head of a patronyme fiche: what the name is, and — AC1 — the naming
 * system it belongs to, stated in the header rather than left to the reader
 * to infer from which fields the dossier below happens to show.
 */
// @req REQ-133
export function PatronymeFicheTitle({
  patronyme,
}: {
  patronyme: PublicPatronyme;
}) {
  return (
    <header className="afh-parchment-head">
      <p className="afh-parchment-eyebrow">{t.eyebrow}</p>
      <h1>{patronyme.nameMain}</h1>
      <p className="afh-parchment-lede">
        {t.nameSystemStatementPrefix} {t.nameSystemLabels[patronyme.nameSystem]}
      </p>
    </header>
  );
}
