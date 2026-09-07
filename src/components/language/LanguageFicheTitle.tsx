import type { LanguagePageData } from "@/lib/languageDataTransformer";
import { FieldProvenanceMarker } from "@/components/fiche/FieldProvenanceMarker";
import type { Language } from "@/types/shared";
import { languageFicheCopy } from "@/lib/i18n/copy/languageFiche";

/**
 * The band a language fiche opens on, above the parchment.
 *
 * `nameProvenance` (REQ-136) is the only thing the title needs to qualify:
 * `sourced` means the fiche's own source names the language, and gets no
 * marker at all, exactly like a `declared` field elsewhere on a fiche.
 * `derived` means the name is the majority vote across the peoples and
 * sources that mention the language, not an attested one — AC1 asks that
 * this be visible on the fiche, not folded silently into the heading.
 */
// @req REQ-136
export function LanguageFicheTitle({
  data,
  language,
}: {
  data: LanguagePageData;
  language: Language;
}) {
  const copy = languageFicheCopy[language];
  return (
    <header className="afh-parchment-head">
      <p className="afh-parchment-eyebrow">{copy.eyebrow}</p>
      <h1>{data.name}</h1>
      {data.nameProvenance === "derived" && (
        <FieldProvenanceMarker
          state="derived"
          origin={copy.majorityVote}
          language={language}
          className="mt-2"
        />
      )}
    </header>
  );
}
