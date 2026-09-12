import { DossierLinks } from "@/components/dossiers/DossierLinks";
import type { ReactNode } from "react";

import {
  getAdmin0Name,
  type FamilyFootprintCountry,
} from "@/lib/atlas/overlays";
import { getCountryRoute, getPeopleRoute } from "@/lib/routing";
import { classifyFieldProvenance } from "@/lib/fieldProvenance";
import { FieldProvenanceMarker } from "@/components/fiche/FieldProvenanceMarker";
import { FicheSection as Section } from "@/components/fiche/FicheSection";
import { FicheStatCard } from "@/components/fiche/FicheStatCard";
import {
  MEMBER_PEOPLES_SHOWN,
  rankFootprint,
  rankFootprintFromCounts,
  rankMemberPeoplesByReach,
  type MemberPeopleLike,
} from "@/lib/familyFootprintRanking";
import {
  footprintWording,
  type FamilyFootprintProvenance,
} from "@/lib/familyFootprintSource";
import type { FamilyPageData } from "@/lib/familyDataTransformer";
import { ficheSourceLabel } from "@/lib/afrik/ficheSourceLabel";
import { sourceStandingLabel } from "@/lib/glossaire/vocabularies";
import { isSourceTier } from "@/types/sources";
import type { Language } from "@/types/shared";
import { familyCopy } from "@/lib/i18n/copy/family";
import { ficheCopy } from "@/lib/i18n/copy/fiche";

/**
 * The family fiche's reading: an opening and five sections on parchment, below
 * the night band the globe stands in.
 *
 * A family fiche may declare no geographic distribution at all, and the honest
 * response is neither to hide the chapter nor to quietly substitute the derived
 * footprint for it, but to show the gap and then show what can be reconstructed
 * around it, labelled as reconstruction. An empty field is a fact about the
 * state of the corpus; erasing it would delete that fact.
 *
 * The gap is shown by the cards and the derived marker, not argued in prose.
 * The chapter was once headed "Ce que la fiche déclare, ce qu'elle ne déclare
 * pas" — a title about the atlas's editorial method, above four figures about
 * a linguistic family.
 */

export interface FamilyParchmentProps {
  data: FamilyPageData;
  language: Language;
  /**
   * The same countries, in the same order, the globe drew. Optional: absent it,
   * the ranking is derived from the fiche's own footprint map by the same rule,
   * so the parchment renders correctly on its own.
   */
  footprintCountries?: readonly FamilyFootprintCountry[];
  memberPeoples: readonly MemberPeopleLike[];
  memberPeopleCount: number;
  /**
   * Which rule produced the footprint the globe drew. Defaults to the charter
   * rule; a macro-family fiche passes the fallback so the text describes the
   * rule the page actually applied (REQ-116).
   */
  footprintProvenance?: FamilyFootprintProvenance;
  /**
   * Chapters the route composes outside this file, slotted before the sources
   * footer. The footer closes the fiche — the reading rail lists chapters in
   * document order, and a chapter after the footer tells a reader the document
   * ended one chapter too early. Same slot, same reason, as CountryParchment.
   */
  children?: ReactNode;
  /**
   * The way out of the fiche — `FicheOnward`, composed by the route.
   *
   * Its own slot rather than one more thing in `children`, because it has to
   * sit last among them and `children` cannot promise an order. A node rather
   * than the links themselves, because the block reads relations off awaited
   * services and resolving them here would make this parchment async — which
   * resolves every synchronous render of the fiche tree to an empty div, the
   * failure `FicheJsonLd` records.
   */
  onward?: ReactNode;
}

/**
 * One figure, and whether the fiche declares it.
 *
 * The device itself is shared with the country record — see `FicheStatCard`,
 * which carries the reasoning. What stays here is this surface's own word for
 * an absent figure: the family record says "vide" where the country record
 * stands a dash, and neither should silently inherit the other's.
 */
function StatCard({
  id,
  label,
  value,
  language,
}: {
  id: string;
  label: string;
  value: unknown;
  language: Language;
}) {
  return (
    <FicheStatCard
      id={id}
      label={label}
      value={value}
      emptyValue={familyCopy[language].parchment.empty}
      language={language}
    />
  );
}

/**
 * Sources carry markdown links and emphasis, and are written by contributors
 * as JSON. Rendering them as markup would turn a fiche into an injection
 * vector, so the text is never handed to the DOM as HTML: it is split into
 * plain runs and real elements, and anything that is not a recognised link or
 * emphasis stays text.
 */
function renderSourceText(raw: string): ReactNode[] {
  const pattern = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|\*([^*]+)\*/g;
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(raw)) !== null) {
    if (match.index > cursor) nodes.push(raw.slice(cursor, match.index));
    if (match[1] && match[2]) {
      nodes.push(
        <a
          key={`${match.index}-link`}
          href={match[2]}
          rel="noreferrer noopener"
          target="_blank"
        >
          {match[1]}
        </a>
      );
    } else if (match[3]) {
      nodes.push(<em key={`${match.index}-em`}>{match[3]}</em>);
    }
    cursor = match.index + match[0].length;
  }
  if (cursor < raw.length) nodes.push(raw.slice(cursor));
  return nodes;
}

// @req REQ-116
export function FamilyParchment({
  data,
  language,
  footprintCountries,
  memberPeoples,
  memberPeopleCount,
  footprintProvenance = "member-peoples",
  children,
  onward,
}: FamilyParchmentProps) {
  const copy = familyCopy[language].parchment;
  const { hero, decolonialHeader, generalInfo, distribution } = data;
  const wording = footprintWording(footprintProvenance, language);
  // Two states, like the cards above. Normally the family declares no
  // distribution and this section shows the footprint reconstructed from its
  // peoples, marked as derived. Should a fiche declare one, that is a stronger
  // fact than the reconstruction and is shown instead, unmarked — a derived
  // value never overrides a declared one (REQ-119).
  const derivedFootprint =
    footprintCountries && footprintCountries.length > 0
      ? rankFootprint(footprintCountries)
      : rankFootprintFromCounts(distribution.footprintByCountry);
  const declaredFootprint = rankFootprintFromCounts(
    distribution.distributionByCountry
  );
  const showsDerived = derivedFootprint.length > 0;
  const footprint = showsDerived ? derivedFootprint : declaredFootprint;
  // Same self-sufficiency as the footprint above: the route hands in the real
  // member peoples with the countries each reaches, but the fiche's own
  // associatedPeoples are enough to render the section without them. Those
  // carry no countries, so the list then names the peoples without their reach
  // rather than claiming a reach of zero.
  const ranked = rankMemberPeoplesByReach(
    memberPeoples.length > 0
      ? memberPeoples
      : generalInfo.associatedPeoples.map((people) => ({
          id: people.peopleId,
          nameMain: people.name,
          currentCountries: [],
        }))
  );

  const distributionProvenance = classifyFieldProvenance(
    distribution.distributionByCountry
  ).state;

  return (
    <div className="afh-parchment" id="fiche">
      {/* The head and the trail stand above the globe now (FamilyFicheTitle).
          One chip stayed, and it is the only one that says something no
          section below says better: that the fiche declares no distribution
          at all. The two that left each restated a section a screen down —
          the languages count, which the "Langues" stat card states under the
          rubric naming where it is read; and "N peuples · M pays dérivés",
          which the empreinte section states in a sentence that also says what
          they were derived from and by which rule. Bare in a chip, "dérivés"
          asserted a provenance the chip could not name.

          Rendered only when that chip applies: an empty bordered strip under
          the globe is worse than no band. */}
      {distributionProvenance === "missing" && (
        <div className="afh-parchment-head">
          <div className="afh-chips">
            <span className="afh-chip" data-tone="missing">
              {copy.undeclaredDistribution}
            </span>
          </div>
        </div>
      )}

      <Section title={copy.figures}>
        <div className="afh-stat-cards">
          <StatCard
            language={language}
            id="langues"
            label={copy.languages}
            value={generalInfo.numberOfLanguages}
          />
          <StatCard
            language={language}
            id="locuteurs"
            label={copy.speakers}
            value={
              generalInfo.totalSpeakers !== null
                ? `${Math.round(generalInfo.totalSpeakers / 1e6)} M`
                : null
            }
          />
          <StatCard
            language={language}
            id="branches"
            label={copy.branches}
            value={generalInfo.branches}
          />
          <StatCard
            language={language}
            id="distribution"
            label={copy.distribution}
            value={distribution.distributionByCountry}
          />
        </div>

        {distributionProvenance === "missing" && (
          /* Charter §4 asks that a real gap be stated, then that what is
             derivable be derived and marked as such. The two cards above
             state it and the footprint below is marked derived, so what is
             left to write is the consequence — one sentence. The paragraph
             that stood here argued the editorial choice to the reader
             ("plutôt que de masquer la section ou d'inventer une aire…"),
             which is a decision they were never asked to weigh. */
          <div className="afh-parchment-gap">
            <p>{copy.missingDistribution}</p>
          </div>
        )}
      </Section>

      <Section title={copy.footprint} note={wording.sectionNote}>
        <p>
          {footprintProvenance === "declared-associated-peoples"
            ? copy.footprintDeclaredPeoples(memberPeopleCount, footprint.length)
            : copy.footprintMemberPeoples(
                memberPeopleCount,
                footprint.length
              )}{" "}
          {copy.borderNote}
        </p>

        {/* The one thing about its geography the fiche does state, in words.
            It belongs beside the reconstruction rather than above it: the
            reader can then see what was declared and what was computed as two
            statements about the same subject. */}
        {generalInfo.geographicArea && (
          <p>
            <strong>{copy.declaredArea}</strong> {generalInfo.geographicArea}
          </p>
        )}

        {showsDerived && (
          <FieldProvenanceMarker
            state="derived"
            origin={wording.origin}
            language={language}
            className="mb-3"
          />
        )}

        <ul className="afh-rank" data-testid="footprint-ranking">
          {footprint.map((row) => (
            <li key={row.countryId} className="afh-rank-row">
              <span aria-hidden="true">{row.flag}</span>
              {/* Each country of the footprint is itself a fiche; the ranking
                  is the natural place to step across to it. */}
              <a
                className="afh-rank-name"
                href={getCountryRoute(language, row.countryId)}
              >
                {getAdmin0Name(row.countryId, language) ?? row.nameFr}
              </a>
              <span className="afh-rank-n">{row.memberCount}</span>
              <span className="afh-rank-track">
                <span
                  className="afh-rank-fill"
                  style={{ width: `${row.barWidthPercent}%` }}
                />
              </span>
            </li>
          ))}
        </ul>
      </Section>

      {decolonialHeader.originOfHistoricalTerm && (
        <Section title={copy.nameOrigin}>
          <p>{decolonialHeader.originOfHistoricalTerm}</p>
          <DossierLinks
            language={language}
            kind="family"
            id={hero.id}
            section="terminology"
          />
        </Section>
      )}

      <Section
        title={copy.attachedPeoples}
        note={copy.attachedNote(ranked.length, memberPeopleCount)}
      >
        <ul className="afh-members" data-testid="member-peoples">
          {ranked.map((people) => (
            <li key={people.id} className="afh-member">
              {/* The corpus carries each member's PPL_ id and the list threw it
                  away, so the one move a reader of this section wants — open
                  the people it just named — was the one it did not offer. A
                  fiche whose associatedPeoples entry declares no id keeps the
                  plain name rather than linking nowhere. */}
              {people.id ? (
                <a href={getPeopleRoute(language, people.id)}>
                  <b>{people.nameMain}</b>
                </a>
              ) : (
                <b>{people.nameMain}</b>
              )}
              {people.countryIds.length > 0 && (
                <span className="afh-member-spread">
                  {copy.countryCount(people.countryIds.length)} ·{" "}
                  {people.countryIds.join(" ")}
                </span>
              )}
            </li>
          ))}
        </ul>
        {memberPeopleCount > MEMBER_PEOPLES_SHOWN && (
          <p className="afh-parchment-note">
            {copy.omitted(memberPeopleCount - ranked.length)}
          </p>
        )}
      </Section>

      {children}

      {/* Before the bibliography, not after it: the reader this block exists
          for is the one who finished the reading, and almost none of them
          scroll past a source list to find out what to read next. */}
      {onward}

      {/* Printed whether or not the fiche declares a source. It used to be
          gated on there being one, so a family with no sources lost the
          section — and with it #sources, the landmark deep links across the
          app point at, on exactly the fiches whose sourcing a reader would
          most want to check. The people and country parchments have always
          shown the gap instead, which is charter §4. */}
      <Section
        title={copy.sources}
        note={ficheCopy[language].sourceTierNote}
        testId="family-sources"
        /* Deep links across the app point at #sources, and the sources are
           the fiche's own footer landmark. Both predate this layout. */
        as="footer"
        id="sources"
      >
        {data.sources.length > 0 ? (
          <ul className="afh-sources">
            {data.sources.map((source, index) => {
              const label = ficheSourceLabel(source);
              if (!label) return null;
              const tier =
                typeof source === "string" ? null : (source.tier ?? null);
              return (
                <li key={`${label}-${index}`} className="afh-source-row">
                  <span className="afh-chip" data-tier={tier ?? "unknown"}>
                    {sourceStandingLabel(
                      isSourceTier(tier) ? tier : "needs_review",
                      language
                    )}
                  </span>
                  <span>{renderSourceText(label)}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <FieldProvenanceMarker state="missing" language={language} />
        )}
      </Section>
    </div>
  );
}
