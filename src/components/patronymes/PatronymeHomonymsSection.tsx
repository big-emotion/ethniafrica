import type { PublicPatronyme } from "@/api/v2/schemas/patronymes";
import { FicheSection } from "@/components/fiche/FicheSection";
import { FieldProvenanceMarker } from "@/components/fiche/FieldProvenanceMarker";
import { readGaps, readHomonyms } from "@/lib/patronymes/content";
import { resolveChapter } from "@/lib/fieldProvenance";
import { translations } from "@/lib/translations";

const t = translations.fr.patronymes;

/**
 * Other things the same string names.
 *
 * "Bambara" is a people, a language and a surname; "Bamba" is a people, an
 * individual nickname and a clan name with no demonstrated link between them.
 * Naming those collisions on the fiche is what stops a reader — or a search
 * that matched on the string alone — from inferring a filiation that no
 * source supports.
 *
 * A chapter of the strict model with no section until now. Empty on all 30
 * dossiers, and 20 of them explain why in `gaps[]`.
 */
// @req REQ-133
export function PatronymeHomonymsSection({
  patronyme,
}: {
  patronyme: PublicPatronyme;
}) {
  const homonyms = readHomonyms(patronyme.content);
  const chapter = resolveChapter(
    "name",
    "homonyms",
    homonyms,
    readGaps(patronyme.content)
  );

  return (
    <FicheSection title={t.homonymsTitle}>
      {homonyms.length > 0 ? (
        <ul>
          {homonyms.map((homonym) => (
            <li key={homonym.label}>
              {homonym.label}
              {homonym.entityType ? <> ({homonym.entityType})</> : null}
              {homonym.distinction ? <> — {homonym.distinction}</> : null}
            </li>
          ))}
        </ul>
      ) : (
        <FieldProvenanceMarker state={chapter.state} reason={chapter.reason} />
      )}
    </FicheSection>
  );
}
