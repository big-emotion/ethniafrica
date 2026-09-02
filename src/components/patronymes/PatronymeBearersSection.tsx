import type { PublicPatronyme } from "@/api/v2/schemas/patronymes";
import { FicheSection } from "@/components/fiche/FicheSection";
import { FieldProvenanceMarker } from "@/components/fiche/FieldProvenanceMarker";
import { readGaps } from "@/lib/patronymes/content";
import { resolveChapter } from "@/lib/fieldProvenance";
import { translations } from "@/lib/translations";

const t = translations.fr.patronymes;

/**
 * AC3 / DEC-040 — a bearer entry is rendered exactly as the API already
 * minimizes it (id, fullName, roleCategory) and nothing is enriched here:
 * no ethnic or geographic inference is drawn from the fact that a named
 * person carries this patronyme. The editorial note is shown alongside the
 * list rather than only in a tooltip, because the guarantee is a claim about
 * the whole fiche and belongs where every reader sees it.
 *
 * Curation-time only: which persons are eligible to appear here at all
 * (public figures, the deceased, or the self-identified) is a DEC-040
 * guarantee enforced when `afrik_patronyme_persons` rows are authored, not
 * something this component can verify at render time.
 */
// @req REQ-133
export function PatronymeBearersSection({
  patronyme,
}: {
  patronyme: PublicPatronyme;
}) {
  const { bearers } = patronyme;

  // An undocumented chapter is marked the way every other fiche marks one
  // (charter §4, REQ-119), rather than by a sentence of its own: this section
  // used to print a bare paragraph, which read as prose the corpus had written
  // instead of as a silence the corpus is admitting to.
  const chapter = resolveChapter(
    "name",
    "bearers",
    bearers.length > 0 ? bearers : null,
    readGaps(patronyme.content)
  );

  return (
    <FicheSection title={t.bearersTitle} note={t.bearersEditorialNote}>
      {bearers.length === 0 ? (
        <FieldProvenanceMarker state={chapter.state} reason={chapter.reason} />
      ) : (
        <ul className="afh-prose-list">
          {bearers.map((bearer) => (
            <li key={bearer.id}>
              <span>{bearer.fullName}</span> —{" "}
              <span>{bearer.roleCategory || t.roleCategoryFallback}</span>
            </li>
          ))}
        </ul>
      )}
    </FicheSection>
  );
}
