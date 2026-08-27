import type { ReactNode } from "react";

import { KingdomsTimeline } from "@/components/country/KingdomsTimeline";
import {
  PeoplesSection,
  declaredShare,
} from "@/components/country/PeoplesSection";
import { SourcesFooter } from "@/components/country/SourcesFooter";
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
 * A section is absent when the corpus does not fill it, rather than standing
 * as a heading over nothing. That absence is itself a reading of the corpus,
 * and a truer one than an empty block.
 */

interface SectionProps {
  title: string;
  /** The corpus field the section reads, named in the mockup's own terms. */
  note: string;
  children: ReactNode;
  as?: "section" | "footer";
  id?: string;
}

function Section({
  title,
  note,
  children,
  as: Tag = "section",
  id,
}: SectionProps) {
  return (
    <Tag className="afh-parchment-section" id={id}>
      <h2>{title}</h2>
      <p className="afh-parchment-note">{note}</p>
      {children}
    </Tag>
  );
}

export interface CountryParchmentProps {
  data: CountryPageData;
  /**
   * The two fields §1 reads straight from the corpus. The transformer parses
   * them into an etymology shape built for the card layout; the mockup prints
   * the sentence the fiche actually wrote.
   */
  country: CountryDetail;
  hasSourceFlag?: boolean;
}

// @req REQ-115
export function CountryParchment({
  data,
  country,
  hasSourceFlag,
}: CountryParchmentProps) {
  const etymology = country.etymology?.trim();
  const nameOriginActor = country.nameOriginActor?.trim();
  const hasPeoples = data.peoples.rows.length > 0;
  const declared = hasPeoples ? declaredShare(data.peoples.rows) : 100;

  return (
    <div className="afh-parchment" id="fiche">
      <header className="afh-parchment-head">
        <p className="afh-parchment-eyebrow">{data.hero.iso} · fiche pays</p>
        <h1>{data.hero.countryName}</h1>
        {data.hero.nameOfficial && (
          <p className="afh-parchment-lede">{data.hero.nameOfficial}</p>
        )}
      </header>

      {(etymology || nameOriginActor) && (
        <Section
          title="Étymologie du nom"
          note="content.etymology · nameOriginActor"
        >
          {etymology && <p>{etymology}</p>}
          {nameOriginActor && (
            <div className="afh-parchment-callout">
              <b>Ce que la fiche refuse de taire.</b> {nameOriginActor}
            </div>
          )}
        </Section>
      )}

      {hasPeoples && (
        <Section
          title="Peuples du pays"
          note="content.demographics.peoples · content.majorPeoples"
        >
          <PeoplesSection data={data.peoples} />
          {declared < 99 && (
            <div className="afh-parchment-callout">
              <b>Pourquoi la somme n&apos;atteint pas 100&nbsp;%.</b> La règle
              FR28 porte sur la <em>totalité</em>{" "}
              {/* Explicit: the JSX transform drops the space that opens a text
                  node following an element, and "totalitédes" shipped once. */}
              des fiches d&apos;un pays, qui doivent sommer dans la bande [99,
              101]&nbsp;% — le reste n&apos;est pas encore réparti dans le
              corpus.
            </div>
          )}
        </Section>
      )}

      {data.kingdoms.cards.length > 0 && (
        <Section
          title="Royaumes et formations politiques"
          note="content.kingdoms"
        >
          <KingdomsTimeline cards={data.kingdoms.cards} />
        </Section>
      )}

      {data.sources.length > 0 && (
        <Section
          title="Sources"
          note="content.sources · politique de paliers"
          as="footer"
          id="sources"
        >
          <SourcesFooter
            sources={data.sources}
            hasSourceFlag={hasSourceFlag}
            variant="parchment"
          />
        </Section>
      )}
    </div>
  );
}
