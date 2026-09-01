import type { PublicPatronyme } from "@/api/v2/schemas/patronymes";
import { FicheSection } from "@/components/fiche/FicheSection";
import { PatronymeSourceCitation } from "@/components/patronymes/PatronymeSourceCitation";
import { readOrigin } from "@/lib/patronymes/content";
import { translations } from "@/lib/translations";

const t = translations.fr.patronymes;

/**
 * The sourced origin of a naming system. A `griot_oral_tradition` origin
 * gets its own wording and its own attribution line: an oral chain of
 * transmission is the source, and presenting it as a bare fact would let a
 * griot's telling read as the corpus's own claim rather than a transcription
 * of one (docs/design/naming-subtype-taxonomy.md).
 *
 * Renders nothing when the corpus documents no origin — omitted, not shown
 * empty, matching the rest of the patronyme fiche's opaque-content posture.
 */
// @req REQ-133
export function PatronymeOriginSection({
  patronyme,
}: {
  patronyme: PublicPatronyme;
}) {
  const origin = readOrigin(patronyme.content);
  if (!origin) return null;

  const isGriotOralTradition = origin.originType === "griot_oral_tradition";

  return (
    <FicheSection title={t.originTitle}>
      <p>{t.originTypeLabels[origin.originType]}</p>
      {isGriotOralTradition ? (
        <p className="afh-parchment-note">
          {t.griotOriginNote}
          {origin.griot ? (
            <>
              {" "}
              {t.griotAttributionPrefix} {origin.griot}.
            </>
          ) : null}
        </p>
      ) : null}
      {origin.sources.length > 0 ? (
        <>
          <h3>{t.sourcesTitle}</h3>
          <ul>
            {origin.sources.map((source) => (
              <li key={source.title}>
                <PatronymeSourceCitation source={source} />
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </FicheSection>
  );
}

export default PatronymeOriginSection;
