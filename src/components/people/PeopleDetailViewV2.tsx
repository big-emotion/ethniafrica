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

const SECTION_DELAY_MS = [0, 50, 100, 150, 200, 250, 300] as const;

function SectionCard({
  children,
  label,
  icon,
  iconBg,
  iconColor,
  delayIndex,
}: {
  children: React.ReactNode;
  label: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  delayIndex: number;
}) {
  return (
    <section
      // The label, without the decorative glyph the heading prefixes it with.
      // The parity contract reads the fiche's section order off this.
      data-fiche-section={label}
      className="people-fade-in rounded-[var(--country-radius-xl)] md:rounded-[20px] xl:rounded-[22px] p-[18px] md:p-6 xl:p-7 relative overflow-hidden"
      style={{
        background: "var(--country-card)",
        border: "1px solid var(--country-border)",
        animationDelay: `${SECTION_DELAY_MS[delayIndex] ?? 0}ms`,
      }}
    >
      {/* A heading, not a styled div: it is the section's title, the mockup
          writes it as one, and the blocks below open on h3. Without it the
          parchment went from the fiche's h1 straight to those — the whole of
          its Lighthouse accessibility gap. */}
      <h2
        className="flex items-center gap-[6px] text-afh-eyebrow font-extrabold uppercase tracking-[0.14em] mb-[14px] md:mb-[18px]"
        style={{ color: "var(--country-text-soft)" }}
      >
        <span
          aria-hidden="true"
          className="w-5 h-5 rounded-[var(--country-radius-md)] flex items-center justify-center text-afh-caption"
          style={{ background: iconBg, color: iconColor }}
        >
          {icon}
        </span>
        {label}
      </h2>
      {children}
    </section>
  );
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
    <div
      className="w-full pb-3 md:pb-4 xl:pb-5"
      style={{
        fontFamily: "var(--country-font-body)",
        color: "var(--country-text)",
      }}
    >
      <PeopleFicheHead hero={data.hero} countries={data.countries} />

      <AfrikBreadcrumbs items={breadcrumbs} />

      {/* Content area — max-width 800px reading surface */}
      <div
        className="px-3 md:px-4 xl:px-5 space-y-[10px] md:space-y-[14px] xl:space-y-4 mt-[10px] md:mt-[14px] xl:mt-4 mx-auto"
        style={{ maxWidth: "800px" }}
      >
        {/* 1. The name borne, the names imposed — first, before any figure. */}
        <SectionCard
          label="Le nom porté, les noms subis"
          icon="✎"
          iconBg="var(--country-earth-bg)"
          iconColor="var(--country-earth)"
          delayIndex={0}
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
        </SectionCard>

        {/* 2. Why the map draws no border — the globe's grammar, in prose. */}
        {distribution && distribution.length > 0 && (
          <SectionCard
            label="Pourquoi la carte ne trace pas de frontière"
            icon="◌"
            iconBg="var(--country-terracotta-bg)"
            iconColor="var(--country-terracotta)"
            delayIndex={1}
          >
            <PeopleFieldExplainer distribution={distribution} />
          </SectionCard>
        )}

        {/* 3. Origins */}
        {hasOriginContent(data.origin) && (
          <SectionCard
            label="Origines & formation"
            icon="◎"
            iconBg="var(--country-earth-bg)"
            iconColor="var(--country-earth)"
            delayIndex={2}
          >
            <PeopleOriginBlock data={data.origin} />
          </SectionCard>
        )}

        {/* 4. Language */}
        {(data.language.mainLanguage ||
          data.language.isoCodes.length > 0 ||
          data.language.dialects.length > 0 ||
          data.language.vehicularRole) && (
          <SectionCard
            label="Langue"
            icon="🗣"
            iconBg="var(--country-green-bg)"
            iconColor="var(--country-green)"
            delayIndex={3}
          >
            <PeopleLanguageSection data={data.language} />
          </SectionCard>
        )}

        {(data.history.kingdomsOrChiefdoms ||
          data.history.relationsWithNeighbors ||
          data.history.conflictsOrAlliances ||
          data.history.diaspora) && (
          <SectionCard
            label="Rôle historique"
            icon="↳"
            iconBg="var(--country-gold-bg)"
            iconColor="var(--country-gold)"
            delayIndex={4}
          >
            <PeopleHistoryTimeline data={data.history} />
          </SectionCard>
        )}

        <OralNarrativesSection peopleId={data.hero.peopleId} />

        {/* Noms & appellations (below the fold; chips hydrate second-wave, UX-DR18) */}
        <PeopleNamesSection data={data.names} />

        {hasCultureContent(data.culture) && (
          <SectionCard
            label="Culture & spiritualité"
            icon="◈"
            iconBg="var(--country-terracotta-bg)"
            iconColor="var(--country-terracotta)"
            delayIndex={5}
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
          </SectionCard>
        )}

        {(hasRelatedContent(data.relatedPeoples) ||
          relationsPreview.length > 0) && (
          <SectionCard
            label="Peuples voisins & organisation"
            icon="◉"
            iconBg="var(--country-earth-bg)"
            iconColor="var(--country-earth)"
            delayIndex={6}
          >
            <PeopleRelatedPeoplesSection
              data={data.relatedPeoples}
              peopleId={data.hero.peopleId}
              relationsPreview={relationsPreview}
            />
          </SectionCard>
        )}

        {data.countries.distributions.length > 0 && (
          <SectionCard
            label="Répartition géographique"
            icon="◉"
            iconBg="var(--country-terracotta-bg)"
            iconColor="var(--country-terracotta)"
            delayIndex={6}
          >
            <PeopleCountriesSection
              data={data.countries}
              fromPeopleId={data.hero.peopleId}
              fromPeopleName={data.hero.nameMain}
            />
          </SectionCard>
        )}

        {/* Fragmentation coloniale (FR85) — absent below 2 countries */}
        {fragmentation && (
          <SectionCard
            label="Fragmentation coloniale"
            icon="⌗"
            iconBg="var(--country-gold-bg)"
            iconColor="var(--country-gold)"
            delayIndex={6}
          >
            <FragmentationView
              fragmentation={fragmentation}
              variant="fiche-section"
            />
          </SectionCard>
        )}
      </div>

      {data.sources.length > 0 && (
        <div
          className="px-3 md:px-4 xl:px-5 mt-[10px] md:mt-[14px] xl:mt-4 mx-auto"
          style={{ maxWidth: "800px" }}
        >
          <SourcesFooter sources={data.sources} hasSourceFlag={hasSourceFlag} />
        </div>
      )}
    </div>
  );
}
