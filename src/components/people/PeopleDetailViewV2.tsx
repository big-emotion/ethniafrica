import { FlagTarget } from "@/components/flags/FlagTarget";
import type { PeopleDetail } from "@/types/afrik-frontend";
import {
  hasCultureContent,
  hasOriginContent,
  hasRelatedContent,
  transformPeopleData,
  transformSourcedRelationsPreview,
} from "@/lib/peopleDataTransformer";
import type { SourcedRelation } from "@/types/relations";
import {
  PeopleOriginBlock,
  PeopleLanguageSection,
  PeopleHistoryTimeline,
  PeopleCultureGrid,
  PeopleRelatedPeoplesSection,
  PeopleCountriesSection,
} from "@/components/people";
// One sources footer for the three fiches. It lives under country/ for
// historical reasons only — it takes FicheSourceEntry[] and knows nothing
// about countries.
import { SourcesFooter } from "@/components/country/SourcesFooter";
import { PeopleFicheHead } from "@/components/people/PeopleFicheHead";
import { PeopleNamingBlock } from "@/components/people/PeopleNamingBlock";
import { PeopleFieldExplainer } from "@/components/people/PeopleFieldExplainer";
import { AfrikBreadcrumbs } from "@/components/layout/AfrikBreadcrumbs";
import { FicheSection } from "@/components/fiche/FicheSection";
import { FragmentationView } from "@/components/colonization/FragmentationView";
import { OralNarrativesSection } from "@/components/people/OralNarrativesSection";
import { PeopleNamesSection } from "@/components/names/PeopleNamesSection";
import type { PeopleFragmentation } from "@/api/v2/schemas/peopleFragmentation";
import type { PeopleNamesDossier } from "@/api/v2/schemas/names";

export interface PeopleDetailViewV2Props {
  people: PeopleDetail;
  namesDossier?: PeopleNamesDossier | null;
  fragmentation?: PeopleFragmentation | null;
  /** An open flag on this fiche's sourcing, resolved by the route. */
  hasSourceFlag?: boolean;
  /**
   * The fiche's sourced ego network, awaited by the route.
   *
   * The parchment is the fiche's only relations surface now that the panel
   * sequence no longer runs above it, so the neighbours section reads from
   * here instead of standing empty.
   */
  relations?: readonly SourcedRelation[];
  /**
   * Turnstile's public site key, which the culture section's report control
   * needs to be more than a shell. Absent — as it is until the key is
   * configured — the section renders the disabled placeholder instead, the
   * same way the country fiche does.
   */
  turnstileSiteKey?: string;
}

/**
 * The people fiche's parchment — the prose half of the page, under the globe.
 *
 * It is a **server component**, fed by the route. It used to be a client one
 * that fetched its own fiche, fragmentation, names dossier and relations from
 * the browser, which cost the page its server rendering — and with it the axe
 * audit and the Lighthouse score, on a fiche that is measured on both. The
 * route already awaits every one of those, so the fetching was duplicated as
 * well as costly.
 *
 * Two sections open it, in the mockup's order, before any figure:
 *   1. "Le nom porté, les noms subis" — the fiche's editorial position.
 *   2. "Pourquoi la carte ne trace pas de frontière" — the grammar of the
 *      globe above, in the reader's terms, plus the legend for it.
 *
 * The relations preview is fed by the route, from the ego network it already
 * awaited. It briefly stood empty here while FicheSequence's links panel was
 * the fiche's relations surface; that panel no longer runs above the
 * parchment, so this is the surface.
 */
// @req REQ-091
export function PeopleDetailViewV2({
  people,
  namesDossier = null,
  fragmentation = null,
  hasSourceFlag = false,
  relations = [],
  turnstileSiteKey,
}: PeopleDetailViewV2Props) {
  const data = transformPeopleData(people, namesDossier);
  const distribution = people.demography?.distributionByCountry;
  const relationsPreview = transformSourcedRelationsPreview(relations);

  const breadcrumbs = [
    { label: "Familles", href: "/fr/familles" },
    ...(people.languageFamilyId
      ? [
          {
            label: people.languageFamilyName ?? people.languageFamilyId,
            href: `/fr/familles/${people.languageFamilyId}`,
          },
        ]
      : []),
    { label: data.hero.nameMain },
  ];

  return (
    <div className="afh-parchment" id="fiche">
      <PeopleFicheHead hero={data.hero} countries={data.countries} />

      <AfrikBreadcrumbs items={breadcrumbs} />

      {/* 1. The name borne, the names imposed — first, before any figure. */}
      <FicheSection
        title="Le nom porté, les noms subis"
        note="Rubrique « appellations » de la fiche"
      >
        <PeopleNamingBlock
          nameMain={data.hero.nameMain}
          selfAppellation={people.appellations?.selfAppellation}
          exonyms={people.appellations?.exonyms}
          originOfExonyms={data.hero.originOfExonyms}
          whyProblematic={people.appellations?.whyProblematic}
          contemporaryUsage={data.hero.contemporaryUsage}
          isoCode={people.languages?.isoCodes?.[0]}
        />
      </FicheSection>

      {/* 2. Why the map draws no border — the globe's grammar, in prose. */}
      {distribution && distribution.length > 0 && (
        <FicheSection
          title="Pourquoi la carte ne trace pas de frontière"
          note="Dérivé de la répartition par pays"
        >
          <PeopleFieldExplainer distribution={distribution} />
        </FicheSection>
      )}

      {hasOriginContent(data.origin) && (
        <FicheSection title="Origines & formation" note="Rubrique « origines »">
          <PeopleOriginBlock data={data.origin} />
        </FicheSection>
      )}

      {(data.language.mainLanguage ||
        data.language.isoCodes.length > 0 ||
        data.language.dialects.length > 0 ||
        data.language.vehicularRole) && (
        <FicheSection title="Langue" note="Rubrique « langues »">
          <PeopleLanguageSection data={data.language} />
        </FicheSection>
      )}

      {(data.history.kingdomsOrChiefdoms ||
        data.history.relationsWithNeighbors ||
        data.history.conflictsOrAlliances ||
        data.history.diaspora) && (
        <FicheSection
          title="Rôle historique"
          note="Rubrique « rôle historique »"
        >
          <PeopleHistoryTimeline data={data.history} />
        </FicheSection>
      )}

      <OralNarrativesSection peopleId={data.hero.peopleId} />

      {/* Noms & appellations (below the fold; chips hydrate second-wave, UX-DR18) */}
      <PeopleNamesSection data={data.names} />

      {hasCultureContent(data.culture) && (
        <FicheSection
          title="Culture & spiritualité"
          note="Rubrique « culture »"
        >
          <PeopleCultureGrid data={data.culture} />
          {/* The same report control the country fiche's culture section
              carries. It used to live only on the legacy tabbed people
              view; retiring that view without moving it here would have
              taken the people half of the requirement with it. */}
          <div data-testid="section-flag-target-culture" className="mt-3">
            {turnstileSiteKey ? (
              <FlagTarget
                target={{
                  type: "fiche_section",
                  id: people.id,
                  fieldPath: "culture",
                }}
                turnstileSiteKey={turnstileSiteKey}
                triggerLabel="Signaler cette section"
                className="w-auto text-afh-caption"
              />
            ) : (
              <button
                type="button"
                disabled
                className="rounded-md border border-dashed px-2 py-1 text-afh-caption"
                style={{
                  borderColor: "var(--afh-border)",
                  color: "var(--afh-text-soft)",
                }}
                aria-label="Signaler cette section — bientôt disponible"
              >
                Signaler cette section (bientôt disponible)
              </button>
            )}
          </div>
        </FicheSection>
      )}

      {(hasRelatedContent(data.relatedPeoples) ||
        relationsPreview.length > 0) && (
        <FicheSection
          title="Peuples voisins & organisation"
          note="Rubriques « groupes associés » et « organisation »"
        >
          <PeopleRelatedPeoplesSection
            data={data.relatedPeoples}
            peopleId={data.hero.peopleId}
            relationsPreview={relationsPreview}
          />
        </FicheSection>
      )}

      {data.countries.distributions.length > 0 && (
        <FicheSection
          title="Répartition géographique"
          note="Rubrique « démographie » · année de référence 2025"
        >
          <PeopleCountriesSection
            data={data.countries}
            fromPeopleId={data.hero.peopleId}
            fromPeopleName={data.hero.nameMain}
          />
        </FicheSection>
      )}

      {/* Fragmentation coloniale (FR85) — absent below 2 countries */}
      {fragmentation && (
        <FicheSection
          title="Fragmentation coloniale"
          note="Dérivé de la présence du peuple dans plusieurs pays"
        >
          <FragmentationView
            fragmentation={fragmentation}
            variant="fiche-section"
          />
        </FicheSection>
      )}

      {/* Deep links across the app point at #sources; until now the only such
          anchor in the tree belonged to the family fiche, so every citation
          chip on a people fiche resolved to nothing. */}
      {data.sources.length > 0 && (
        <FicheSection
          title="Sources"
          note="Rubrique « sources » · politique de paliers"
          as="footer"
          id="sources"
        >
          <SourcesFooter
            sources={data.sources}
            hasSourceFlag={hasSourceFlag}
            variant="parchment"
          />
        </FicheSection>
      )}
    </div>
  );
}
