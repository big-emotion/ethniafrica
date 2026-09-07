import type { PublicPatronyme } from "@/api/v2/schemas/patronymes";
import { FicheSection } from "@/components/fiche/FicheSection";
import { FieldProvenanceMarker } from "@/components/fiche/FieldProvenanceMarker";
import { readCorpusBearers, readGaps } from "@/lib/patronymes/content";
import { resolveChapter } from "@/lib/fieldProvenance";
import { getTranslation } from "@/lib/translations";
import type { Language } from "@/types/shared";

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
 *
 * Two lists feed the chapter. The person records the API joins carry a role;
 * the bearers the dossier names itself carry only a name. The corpus has
 * written every one of its 89 bearers the second way and the loader links
 * only the first, so until now the chapter said "Donnée manquante" on the
 * Keïta fiche while the dossier named Soundiata Keïta.
 */
// @req REQ-133
export function PatronymeBearersSection({
  patronyme,
  language,
}: {
  patronyme: PublicPatronyme;
  language: Language;
}) {
  const t = getTranslation(language).patronymes;
  const { bearers } = patronyme;
  const namedInRecords = new Set(bearers.map((bearer) => bearer.fullName));
  const corpusBearers = readCorpusBearers(patronyme.content).filter(
    (bearer) => !namedInRecords.has(bearer.displayName)
  );
  const documented = bearers.length + corpusBearers.length > 0;

  // An undocumented chapter is marked the way every other fiche marks one
  // (charter §4, REQ-119), rather than by a sentence of its own: this section
  // used to print a bare paragraph, which read as prose the corpus had written
  // instead of as a silence the corpus is admitting to.
  const chapter = resolveChapter(
    "name",
    "bearers",
    documented ? [...bearers, ...corpusBearers] : null,
    readGaps(patronyme.content)
  );

  return (
    <FicheSection title={t.bearersTitle} note={t.bearersEditorialNote}>
      {!documented ? (
        <FieldProvenanceMarker
          state={chapter.state}
          reason={chapter.reason}
          language={language}
        />
      ) : (
        <ul className="afh-prose-list">
          {bearers.map((bearer) => (
            <li key={bearer.id}>
              <span>{bearer.fullName}</span> —{" "}
              <span>{bearer.roleCategory || t.roleCategoryFallback}</span>
            </li>
          ))}
          {corpusBearers.map((bearer) => (
            <li key={bearer.displayName}>
              <span>{bearer.displayName}</span>
            </li>
          ))}
        </ul>
      )}
    </FicheSection>
  );
}
