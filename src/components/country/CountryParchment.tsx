import { Info } from "lucide-react";
import type { ReactNode } from "react";

import { KingdomsTimeline } from "@/components/country/KingdomsTimeline";
import { PeoplesSection } from "@/components/country/PeoplesSection";
import { SourcesFooter } from "@/components/country/SourcesFooter";
import {
  FicheSection as Section,
  SOURCE_TIER_NOTE,
} from "@/components/fiche/FicheSection";
import { FieldProvenanceMarker } from "@/components/fiche/FieldProvenanceMarker";
import type { CountryPageData } from "@/lib/countryDataTransformer";
import type { CountryDetail } from "@/types/afrik-frontend";
import type { Language } from "@/types/shared";

/**
 * The country fiche's reading: a head and four sections on parchment, below
 * the night band the globe stands in.
 *
 * The head states the country and, under it, the official name — both of which
 * the corpus already carries, `nameCommonFr` for the one and `nameFr` for the
 * other. Nothing here is authored: the mockup's italic "un nom de 1914" is a
 * date no field states, so it is not written.
 *
 * Every chapter the fiche model defines is printed, whether or not the corpus
 * fills it, and an unfilled one carries `FieldProvenanceMarker`. This fiche
 * used to drop those chapters, arguing that an absence read the silence more
 * honestly than an empty block. Charter §4 rules the other way, and it is the
 * stronger argument: an empty field is information about the state of the
 * corpus, and dropping the chapter is what deletes it. The reader of a fiche
 * with no royaumes could not tell "nobody has written this yet" from "this
 * country had none" — the atlas's own contribution surface depends on their
 * being able to.
 */

export interface CountryParchmentProps {
  data: CountryPageData;
  language: Language;
  /**
   * The two fields §1 reads straight from the corpus. The transformer parses
   * them into an etymology shape built for the card layout; the mockup prints
   * the sentence the fiche actually wrote.
   */
  country: CountryDetail;
  hasSourceFlag?: boolean;
  /**
   * Chapters the page adds beyond the four the mockup frames. They land here,
   * between the royaumes and the sources, because the sources close the
   * reading: rendered after this component instead, they put the bibliography
   * in the middle of the fiche.
   */
  children?: ReactNode;
}

// @req REQ-115
export function CountryParchment({
  data,
  language,
  country,
  hasSourceFlag,
  children,
}: CountryParchmentProps) {
  const etymology = country.etymology?.trim();
  const nameOriginActor = country.nameOriginActor?.trim();
  const hasPeoples =
    data.peoples.rows.length > 0 ||
    Boolean(data.peoples.totalPopulationFormatted);

  return (
    <div className="afh-parchment" id="fiche">
      {/* The head stands above the globe now (CountryFicheTitle), so a
          reader is told which country they opened before the band fills the
          screen. The parchment opens on its first chapter. */}

      <Section title="Étymologie du nom">
        {etymology || nameOriginActor ? (
          <>
            {etymology && <p>{etymology}</p>}
            {nameOriginActor && (
              <div className="afh-parchment-callout">
                <Info
                  className="afh-parchment-callout-icon"
                  aria-hidden="true"
                />
                {nameOriginActor}
              </div>
            )}
          </>
        ) : (
          <FieldProvenanceMarker state="missing" language={language} />
        )}
      </Section>

      <Section title="Peuples du pays">
        {!hasPeoples ? (
          <FieldProvenanceMarker state="missing" language={language} />
        ) : (
          /* A shortfall in the declared shares is stated once, by
             PeoplesSection's own coverage note, in the reader's terms. The
             callout that stood here repeated that sentence and prefixed it
             with the identifier of the validation rule behind it — a number
             no visitor can act on. */
          <PeoplesSection data={data.peoples} language={language} />
        )}
      </Section>

      <Section title="Royaumes et formations politiques">
        {data.kingdoms.cards.length > 0 ? (
          <KingdomsTimeline cards={data.kingdoms.cards} />
        ) : (
          <FieldProvenanceMarker state="missing" language={language} />
        )}
      </Section>

      {children}

      <Section title="Sources" note={SOURCE_TIER_NOTE} as="footer" id="sources">
        {data.sources.length > 0 ? (
          <SourcesFooter
            sources={data.sources}
            hasSourceFlag={hasSourceFlag}
            variant="parchment"
          />
        ) : (
          <FieldProvenanceMarker state="missing" language={language} />
        )}
      </Section>
    </div>
  );
}
