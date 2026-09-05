import Link from "next/link";

import type { PublicPatronyme } from "@/api/v2/schemas/patronymes";
import { FicheSection } from "@/components/fiche/FicheSection";
import { FieldProvenanceMarker } from "@/components/fiche/FieldProvenanceMarker";
import { readGaps } from "@/lib/patronymes/content";
import { resolveChapter } from "@/lib/fieldProvenance";
import { getPatronymeRoute } from "@/lib/routing";
import { getTranslation } from "@/lib/translations";
import type { Language } from "@/types/shared";

/**
 * The attested alliance terms the corpus writes, and what each means in
 * in the reader's locale. The term stays on the page — it is what the sources say — and the
 * gloss sits beside it, because "sanankuya" alone told a reader nothing.
 *
 * Only terms the corpus actually uses are listed; a term not found here is
 * printed as attested, which is what the corpus already does for the Senufo
 * pact it names in French.
 */
/**
 * Alliances between names — the joking-kinship pairs (sanankuya and its
 * regional equivalents) the corpus records by attested term rather than by a
 * category of our own.
 *
 * The allied name comes resolved from the API: this section once printed
 * `targetPatronymeId` as the link text, which put "PAT_COULIBALY" on the
 * Keïta fiche — the raw identifier the reader-facing register forbids, only
 * printed by the view instead of written by a curator.
 *
 * The note is printed whether or not the chapter is filled. Fourteen dossiers
 * out of some 790 record a pact, so the ordinary state of this chapter is
 * empty, and an empty chapter titled "Alliances" explained nothing.
 */
// @req REQ-133
export function PatronymeAlliancesSection({
  patronyme,
  language,
}: {
  patronyme: PublicPatronyme;
  language: Language;
}) {
  const t = getTranslation(language).patronymes;
  const { alliances } = patronyme;
  const allianceTermGlosses: Record<string, string> = {
    sanankuya: t.allianceTermGlosses.sanankuya,
    senankuya: t.allianceTermGlosses.sanankuya,
    sinankunya: t.allianceTermGlosses.sanankuya,
  };
  const glossAllianceType = (allianceType: string | null): string => {
    if (!allianceType) return t.allianceTypeFallback;
    const gloss = allianceTermGlosses[allianceType.trim().toLowerCase()];
    return gloss ? `${allianceType}, ${gloss}` : allianceType;
  };
  const chapter = resolveChapter(
    "name",
    "alliances",
    alliances.length > 0 ? alliances : null,
    readGaps(patronyme.content)
  );

  return (
    <FicheSection title={t.alliancesTitle} note={t.alliancesNote}>
      {alliances.length > 0 ? (
        <ul className="afh-prose-list">
          {alliances.map((alliance) => (
            <li key={alliance.targetId}>
              <Link href={getPatronymeRoute(language, alliance.targetId)}>
                {alliance.targetNameMain}
              </Link>
              {" — "}
              {glossAllianceType(alliance.allianceType)}
            </li>
          ))}
        </ul>
      ) : (
        <FieldProvenanceMarker
          state={chapter.state}
          reason={chapter.reason}
          language={language}
        />
      )}
    </FicheSection>
  );
}
