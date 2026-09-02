import Link from "next/link";

import type { PublicPatronyme } from "@/api/v2/schemas/patronymes";
import { FicheSection } from "@/components/fiche/FicheSection";
import { FieldProvenanceMarker } from "@/components/fiche/FieldProvenanceMarker";
import { readAlliances, readGaps } from "@/lib/patronymes/content";
import { resolveChapter } from "@/lib/fieldProvenance";
import { getPatronymeRoute } from "@/lib/routing";
import { translations } from "@/lib/translations";

const t = translations.fr.patronymes;

/**
 * Alliances between names — the joking-kinship pairs (sanankuya and its
 * regional equivalents) the corpus records by attested term rather than by a
 * category of our own.
 *
 * A chapter of the strict model that the fiche has never had a section for.
 * Empty on all 30 dossiers today, and 19 of them say why in `gaps[]`, which
 * is what this prints instead of the generic badge.
 */
// @req REQ-133
export function PatronymeAlliancesSection({
  patronyme,
}: {
  patronyme: PublicPatronyme;
}) {
  const alliances = readAlliances(patronyme.content);
  const chapter = resolveChapter(
    "name",
    "alliances",
    alliances,
    readGaps(patronyme.content)
  );

  return (
    <FicheSection title={t.alliancesTitle}>
      {alliances.length > 0 ? (
        <ul>
          {alliances.map((alliance) => (
            <li key={alliance.targetPatronymeId}>
              <Link href={getPatronymeRoute("fr", alliance.targetPatronymeId)}>
                {alliance.targetPatronymeId}
              </Link>
              {" — "}
              {alliance.allianceType ?? t.allianceTypeFallback}
            </li>
          ))}
        </ul>
      ) : (
        <FieldProvenanceMarker state={chapter.state} reason={chapter.reason} />
      )}
    </FicheSection>
  );
}

export default PatronymeAlliancesSection;
