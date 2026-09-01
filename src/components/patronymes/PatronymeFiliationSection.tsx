import type { PublicPatronyme } from "@/api/v2/schemas/patronymes";
import { FicheSection } from "@/components/fiche/FicheSection";
import { PatronymeSourceCitation } from "@/components/patronymes/PatronymeSourceCitation";
import { readFiliationClaims } from "@/lib/patronymes/content";
import { translations } from "@/lib/translations";

const t = translations.fr.patronymes;

/**
 * AC2 — a contested filiation (worked case: Keïta descent from Soundiata) is
 * presented as "claimed" rather than as settled fact, and its competing
 * account renders alongside it rather than the claim standing alone.
 *
 * Renders nothing when the corpus documents no filiation claim.
 */
// @req REQ-133
export function PatronymeFiliationSection({
  patronyme,
}: {
  patronyme: PublicPatronyme;
}) {
  const claims = readFiliationClaims(patronyme.content);
  if (claims.length === 0) return null;

  return (
    <FicheSection title={t.filiationTitle}>
      {claims.map((claim) => (
        <div key={claim.claim}>
          <p>
            <strong>{t.filiationClaimedLabel}</strong> — {claim.claim}
          </p>
          {claim.competingAccount ? (
            <p>
              <strong>{t.filiationCompetingLabel}</strong> —{" "}
              {claim.competingAccount}
            </p>
          ) : null}
          {claim.sources.length > 0 ? (
            <ul>
              {claim.sources.map((source) => (
                <li key={source.title}>
                  <PatronymeSourceCitation source={source} />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ))}
    </FicheSection>
  );
}

export default PatronymeFiliationSection;
