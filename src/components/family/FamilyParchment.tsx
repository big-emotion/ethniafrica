import type { ReactNode } from "react";

import type { FamilyFootprintCountry } from "@/lib/atlas/overlays";
import { getCountryRoute, getFamilyRoute, getPeopleRoute } from "@/lib/routing";
import { classifyFieldProvenance } from "@/lib/fieldProvenance";
import { FieldProvenanceMarker } from "@/components/fiche/FieldProvenanceMarker";
import { FicheSection as Section } from "@/components/fiche/FicheSection";
import {
  MEMBER_PEOPLES_SHOWN,
  rankFootprint,
  rankFootprintFromCounts,
  rankMemberPeoplesByReach,
  type MemberPeopleLike,
} from "@/lib/familyFootprintRanking";
import {
  FOOTPRINT_WORDING,
  type FamilyFootprintProvenance,
} from "@/lib/familyFootprintSource";
import type { FamilyPageData } from "@/lib/familyDataTransformer";
import { ficheSourceLabel } from "@/lib/afrik/ficheSourceLabel";
import { isSourceTier, SOURCE_TIER_LABELS_FR } from "@/types/sources";

/**
 * The family fiche's reading: an opening and five sections on parchment, below
 * the night band the globe stands in.
 *
 * The section a reader might expect to be hidden — "what this fiche does not
 * declare" — is the one the page opens on. A family fiche declares no
 * geographic distribution at all, and the honest response is neither to hide
 * the section nor to quietly substitute the derived footprint for it, but to
 * show the gap and then show what can be reconstructed around it, labelled as
 * reconstruction. An empty field is a fact about the state of the corpus;
 * erasing it would delete that fact.
 */

/**
 * The second half of the fiche's title.
 *
 * Not a corpus field. It is true of all 24 family fiches for the same
 * structural reason — none declares its own distribution — so storing it would
 * mean writing the same sentence into 24 files and keeping them in step. It
 * lives here, as one editorial constant, with its reason attached.
 *
 * The day a family fiche does declare a distribution, this stops being true of
 * that fiche and has to become conditional on the same provenance check the
 * cards below already run.
 */
const FAMILY_TITLE_PREDICATE = "une aire à reconstruire";

const numberFr = new Intl.NumberFormat("fr-FR");

export interface FamilyParchmentProps {
  data: FamilyPageData;
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
}

/**
 * One figure, and where it comes from — said as the fiche's own rubric, not as
 * the key a developer would grep for. "generalInfo.totalSpeakers" under a card
 * headed "Locuteurs" told a reader nothing they could act on; the rubric names
 * the place in the fiche they would actually go and look.
 *
 * `provenance` is computed, never hard-coded. The mockup writes "vide" into
 * the branches and distribution cards because that is what the recette
 * database holds; every fiche in this repository's corpus already declares
 * both. A card that stated the empty case as a constant would keep saying
 * "vide" after the corpus is loaded — a page asserting a gap that no longer
 * exists, in a project whose whole posture is the transparency of its
 * sources, and no test would have caught it.
 */
function StatCard({
  id,
  label,
  rubric,
  value,
  emptyValue,
}: {
  id: string;
  label: string;
  /** Where in the fiche the figure is read, in the reader's terms. */
  rubric: string;
  value: unknown;
  emptyValue?: string;
}) {
  const provenance = classifyFieldProvenance(value).state;
  const missing = provenance === "missing";
  const shown = missing
    ? (emptyValue ?? "vide")
    : Array.isArray(value)
      ? numberFr.format(value.length)
      : typeof value === "object" && value !== null
        ? numberFr.format(Object.keys(value).length)
        : typeof value === "number"
          ? numberFr.format(value)
          : String(value);

  return (
    <div
      className="afh-stat-card"
      data-testid={`stat-card-${id}`}
      data-provenance={provenance}
      data-missing={missing || undefined}
    >
      <span className="afh-stat-card-n">{shown}</span>
      <span className="afh-stat-card-k">{label}</span>
      <span className="afh-stat-card-src">{rubric}</span>
      {/* The app has one wording for an absent field, and it lives in
          FieldProvenanceMarker. Writing a second one here would let the two
          drift and leave readers with two vocabularies for one idea. */}
      <FieldProvenanceMarker state={provenance} className="mt-2" />
    </div>
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
  footprintCountries,
  memberPeoples,
  memberPeopleCount,
  footprintProvenance = "member-peoples",
}: FamilyParchmentProps) {
  const { hero, decolonialHeader, generalInfo, distribution } = data;
  const wording = FOOTPRINT_WORDING[footprintProvenance];
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

  const selfAppellation = decolonialHeader.selfAppellation;
  const nameEn = hero.nameEn ?? decolonialHeader.nameEn;

  const distributionProvenance = classifyFieldProvenance(
    distribution.distributionByCountry
  ).state;

  return (
    <div className="afh-parchment" id="fiche">
      {/* The head and the trail stand above the globe now
          (FamilyFicheTitle). The chips stayed: they are figures about this
          document, and the chapters below immediately qualify them. */}
      <div className="afh-parchment-head">
        <div className="afh-chips">
          {generalInfo.numberOfLanguages !== null && (
            <span className="afh-chip" data-tone="stable">
              {numberFr.format(generalInfo.numberOfLanguages)} langues
            </span>
          )}
          <span className="afh-chip" data-tone="derived">
            {memberPeopleCount} peuples · {footprint.length} pays dérivés
          </span>
          {distributionProvenance === "missing" && (
            <span className="afh-chip" data-tone="missing">
              Distribution non déclarée
            </span>
          )}
        </div>
      </div>

      <Section
        title="Ce que la fiche déclare, ce qu'elle ne déclare pas"
        note="Rubriques « informations générales » et « répartition » de la fiche"
      >
        <div className="afh-stat-cards">
          <StatCard
            id="langues"
            label="Langues"
            rubric="Informations générales · nombre de langues"
            value={generalInfo.numberOfLanguages}
          />
          <StatCard
            id="locuteurs"
            label="Locuteurs"
            rubric="Informations générales · total de locuteurs"
            value={
              generalInfo.totalSpeakers !== null
                ? `${Math.round(generalInfo.totalSpeakers / 1e6)} M`
                : null
            }
          />
          <StatCard
            id="branches"
            label="Branches"
            rubric="Informations générales · branches"
            value={generalInfo.branches}
          />
          <StatCard
            id="distribution"
            label="Distribution"
            rubric="Répartition · par pays"
            value={distribution.distributionByCountry}
          />
        </div>

        {distributionProvenance === "missing" && (
          <div className="afh-parchment-gap">
            <h3>Deux champs vides, et ce qu&apos;on en fait</h3>
            <p>
              Cette fiche ne déclare ni ses branches ni sa répartition par
              pays&nbsp;: les deux rubriques sont vides. Une carte fidèle à la
              seule fiche famille n&apos;aurait donc rien à dessiner. Plutôt que
              de masquer la section ou d&apos;inventer une aire, la fiche
              affiche le manque — puis reconstruit ce qui est reconstructible,
              en le signalant comme tel. Un champ vide reste une information sur
              l&apos;état du corpus&nbsp;; l&apos;effacer la ferait disparaître.
            </p>
          </div>
        )}
      </Section>

      <Section
        title="L'empreinte, et d'où elle vient"
        note={wording.sectionNote}
      >
        <p>
          L&apos;aire dessinée plus haut n&apos;est pas lue dans la fiche
          famille : elle est <strong>calculée</strong>.{" "}
          {footprintProvenance === "declared-associated-peoples" ? (
            <>
              Aucun peuple n&apos;est rattaché directement à cette
              famille&nbsp;: ils relèvent de ses <strong>sous-familles</strong>.
              Plutôt que d&apos;additionner celles-ci — ce qui ferait affirmer à
              la carte une unité que la fiche elle-même conteste — l&apos;aire
              suit la seule liste que la fiche assume, les{" "}
              <strong>peuples que la fiche nomme</strong>
              &nbsp;: l&apos;union des pays où ces{" "}
              <strong>{memberPeopleCount} peuples</strong> se trouvent
              aujourd&apos;hui donne les{" "}
              <strong>{footprint.length} pays</strong> teintés. La carte ne dit
              donc rien de plus que le texte.
            </>
          ) : (
            <>
              Chaque fiche peuple déclare sa famille linguistique et les pays où
              ce peuple se trouve aujourd&apos;hui&nbsp;; l&apos;union de ces
              pays sur les <strong>{memberPeopleCount} peuples</strong>{" "}
              rattachés à cette famille donne les{" "}
              <strong>{footprint.length} pays</strong> teintés, l&apos;intensité
              suivant le nombre de peuples présents.
            </>
          )}{" "}
          Le bord reste tireté partout : une famille linguistique n&apos;a pas
          de frontière, et cet agrégat encore moins que le reste.
        </p>

        {/* The one thing about its geography the fiche does state, in words.
            It belongs beside the reconstruction rather than above it: the
            reader can then see what was declared and what was computed as two
            statements about the same subject. */}
        {generalInfo.geographicArea && (
          <p>
            <strong>Aire déclarée par la fiche&nbsp;:</strong>{" "}
            {generalInfo.geographicArea}
          </p>
        )}

        {showsDerived && (
          <FieldProvenanceMarker
            state="derived"
            origin={wording.origin}
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
                href={getCountryRoute("fr", row.countryId)}
              >
                {row.nameFr}
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
        <Section
          title="D'où vient le nom de la famille"
          note="Rubrique « en-tête décoloniale » de la fiche, « origine du terme historique »"
        >
          <p>{decolonialHeader.originOfHistoricalTerm}</p>
        </Section>
      )}

      <Section
        title="Peuples rattachés"
        note={`${ranked.length} des ${memberPeopleCount} peuples rattachés, classés par étendue`}
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
                <a href={getPeopleRoute("fr", people.id)}>
                  <b>{people.nameMain}</b>
                </a>
              ) : (
                <b>{people.nameMain}</b>
              )}
              {people.countryIds.length > 0 && (
                <span className="afh-member-spread">
                  {people.countryIds.length} pays ·{" "}
                  {people.countryIds.join(" ")}
                </span>
              )}
            </li>
          ))}
        </ul>
        {memberPeopleCount > MEMBER_PEOPLES_SHOWN && (
          <p className="afh-parchment-note">
            {memberPeopleCount - ranked.length} autres peuples rattachés ne sont
            pas listés ici.
          </p>
        )}
      </Section>

      {data.sources.length > 0 && (
        <Section
          title="Sources"
          note="Rubrique « sources » de la fiche · politique de paliers"
          testId="family-sources"
          /* Deep links across the app point at #sources, and the sources are
             the fiche's own footer landmark. Both predate this layout. */
          as="footer"
          id="sources"
        >
          <ul className="afh-sources">
            {data.sources.map((source, index) => {
              const label = ficheSourceLabel(source);
              if (!label) return null;
              const tier =
                typeof source === "string" ? null : (source.tier ?? null);
              return (
                <li key={`${label}-${index}`} className="afh-source-row">
                  <span className="afh-chip" data-tier={tier ?? "unknown"}>
                    {isSourceTier(tier)
                      ? SOURCE_TIER_LABELS_FR[tier]
                      : "Palier à revoir"}
                  </span>
                  <span>{renderSourceText(label)}</span>
                </li>
              );
            })}
          </ul>
        </Section>
      )}
    </div>
  );
}
