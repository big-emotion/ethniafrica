import type { ReactNode } from "react";

import { KingdomsTimeline } from "@/components/country/KingdomsTimeline";
import {
  PeoplesSection,
  declaredShare,
} from "@/components/country/PeoplesSection";
import { SourcesFooter } from "@/components/country/SourcesFooter";
import { FicheSection as Section } from "@/components/fiche/FicheSection";
import { FieldProvenanceMarker } from "@/components/fiche/FieldProvenanceMarker";
import type { CountryPageData } from "@/lib/countryDataTransformer";
import type { CountryDetail } from "@/types/afrik-frontend";

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
  country,
  hasSourceFlag,
  children,
}: CountryParchmentProps) {
  const etymology = country.etymology?.trim();
  const nameOriginActor = country.nameOriginActor?.trim();
  const hasPeoples = data.peoples.rows.length > 0;
  const declared = hasPeoples ? declaredShare(data.peoples.rows) : 100;

  return (
    <div className="afh-parchment" id="fiche">
      {/* The head stands above the globe now (CountryFicheTitle), so a
          reader is told which country they opened before the band fills the
          screen. The parchment opens on its first chapter. */}

      <Section
        title="Étymologie du nom"
        note="Rubriques « étymologie » et « origine du nom » de la fiche"
      >
        {etymology || nameOriginActor ? (
          <>
            {etymology && <p>{etymology}</p>}
            {nameOriginActor && (
              <div className="afh-parchment-callout">
                <b>Ce que la fiche refuse de taire.</b> {nameOriginActor}
              </div>
            )}
          </>
        ) : (
          <FieldProvenanceMarker state="missing" />
        )}
      </Section>

      <Section
        title="Peuples du pays"
        note="Rubriques « démographie » et « peuples principaux » de la fiche"
      >
        {!hasPeoples ? (
          <FieldProvenanceMarker state="missing" />
        ) : (
          <>
            <PeoplesSection data={data.peoples} />
            {declared < 99 && (
              <div className="afh-parchment-callout">
                <b>Pourquoi la somme n&apos;atteint pas 100&nbsp;%.</b> La règle
                FR28 porte sur la <em>totalité</em>{" "}
                {/* Explicit: the JSX transform drops the space that opens a
                    text node following an element, and "totalitédes" shipped
                    once. */}
                des fiches d&apos;un pays, qui doivent sommer dans la bande [99,
                101]&nbsp;% — le reste n&apos;est pas encore réparti dans le
                corpus.
              </div>
            )}
          </>
        )}
      </Section>

      <Section
        title="Royaumes et formations politiques"
        note="Rubrique « royaumes » de la fiche"
      >
        {data.kingdoms.cards.length > 0 ? (
          <KingdomsTimeline cards={data.kingdoms.cards} />
        ) : (
          <FieldProvenanceMarker state="missing" />
        )}
      </Section>

      {children}

      <Section
        title="Sources"
        note="Rubrique « sources » de la fiche · politique de paliers"
        as="footer"
        id="sources"
      >
        {data.sources.length > 0 ? (
          <SourcesFooter
            sources={data.sources}
            hasSourceFlag={hasSourceFlag}
            variant="parchment"
          />
        ) : (
          <FieldProvenanceMarker state="missing" />
        )}
      </Section>
    </div>
  );
}
