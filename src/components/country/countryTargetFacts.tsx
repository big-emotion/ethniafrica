import type { CSSProperties } from "react";

import type { AtlasTargetFacts } from "@/components/atlas/AtlasGlobe";
import type { CountryAtlasBrief } from "@/api/v2/services/countryService";
import { flagFromISO3 } from "@/lib/countryFlag";
import type { AtlasTarget } from "@/lib/atlas/targets";
import type { CountryId } from "@/types/afrik";
import type { CountryDetail } from "@/types/afrik-frontend";
import { getCountryRoute } from "@/lib/routing";
import { ActionLink } from "@/components/ui/ActionLink";
import { deriveCountrySynthesisFromDetail } from "@/lib/home/countrySynthesis";

/**
 * What the globe's panel says when the reader picks the country the fiche is
 * about.
 *
 * A plain record keyed by country, never a resolver function: the route is a
 * server component and AtlasGlobe is a client one, and a function cannot cross
 * that boundary — passing one is what answered every family route with HTTP
 * 500 once already.
 *
 * A country outline is the one closed line the atlas draws, so unlike the
 * people field this panel can speak about a bounded territory. What it counts
 * is still a fact about the corpus, not about the country: "no people attached"
 * means the fiches do not say, and the empty state has to read that way rather
 * than as a zero.
 */

const LABEL_STYLE: CSSProperties = {
  fontSize: "var(--afh-text-caption)",
  letterSpacing: ".08em",
  textTransform: "uppercase",
  // Soft, not muted: these labels are caption-sized, and muted falls under the
  // 4.5:1 small text needs on every ground the panel can sit on.
  color: "var(--afh-text-soft)",
  fontWeight: 700,
};

const NUMBER_STYLE: CSSProperties = {
  display: "block",
  marginTop: 4,
  fontFamily: "var(--afh-font-mono)",
  fontSize: 30,
  fontWeight: 700,
  lineHeight: 1.1,
  color: "var(--afh-text)",
  fontVariantNumeric: "tabular-nums",
};

/**
 * The panel points into the fiche; the fiche lists the peoples in full, with
 * each name paired to its autonym. Naming them all twice would make the panel
 * a second, poorer listing of the same thing.
 */
const NAMES_SHOWN = 6;

const CHIP_STYLE: CSSProperties = {
  justifySelf: "start",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "3px 9px",
  borderRadius: "var(--afh-radius-full)",
  border: "1px solid var(--afh-border)",
  backgroundColor: "var(--afh-bg-warm)",
  fontSize: "var(--afh-text-caption)",
  color: "var(--afh-text-soft)",
};

/**
 * Where the panel's own numbers come from.
 *
 * The fiche's own country is answered from what its fiche declares; every
 * other country from the corpus's join table. Those count different things,
 * and unlabelled they read as one number disagreeing with itself — which is
 * exactly how a panel saying five peoples sat beside a listing saying nine.
 */
function ProvenanceChip({ declared }: { declared: boolean }) {
  return (
    <span style={CHIP_STYLE}>
      {declared ? "Fiche rédigée" : "Présence dérivée des fiches peuple"}
    </span>
  );
}

const countFr = new Intl.NumberFormat("fr-FR");
const compactNumberFr = new Intl.NumberFormat("fr-FR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const BRIEF_VALUE_STYLE: CSSProperties = {
  marginTop: 4,
  color: "var(--afh-text)",
  fontWeight: 700,
  lineHeight: 1.25,
};

const BRIEF_METRIC_LABEL_STYLE: CSSProperties = {
  ...LABEL_STYLE,
  fontSize: "var(--afh-text-eyebrow)",
  letterSpacing: ".05em",
};

const BRIEF_METRIC_STYLE: CSSProperties = {
  minWidth: 0,
  padding: "10px 11px",
  border: "1px solid var(--afh-border)",
  borderRadius: "var(--afh-radius-md)",
  backgroundColor: "var(--afh-bg-warm)",
};

function formatPopulation(
  population: number,
  referenceYear: number | undefined
): string {
  const value = compactNumberFr.format(population);
  return referenceYear ? `${value} · ${referenceYear}` : value;
}

function CountryBriefBody({
  brief,
  documented,
  declared,
}: {
  brief: CountryAtlasBrief | undefined;
  documented: number;
  declared: boolean;
}) {
  const hasPopulation =
    typeof brief?.population === "number" && brief.population > 0;

  return (
    <div data-country-brief="" className="grid gap-3">
      <dl className="grid grid-cols-2 gap-2">
        {hasPopulation ? (
          <div style={BRIEF_METRIC_STYLE}>
            <dt style={BRIEF_METRIC_LABEL_STYLE}>Population</dt>
            <dd style={BRIEF_VALUE_STYLE}>
              {formatPopulation(
                brief.population,
                brief.populationReferenceYear
              )}
            </dd>
          </div>
        ) : null}

        <div
          className={hasPopulation ? undefined : "col-span-2"}
          style={BRIEF_METRIC_STYLE}
        >
          <dt style={BRIEF_METRIC_LABEL_STYLE}>
            {declared ? "Peuples déclarés par la fiche" : "Peuples documentés"}
          </dt>
          <dd style={BRIEF_VALUE_STYLE}>
            {documented > 0 ? countFr.format(documented) : "Non renseigné"}
          </dd>
        </div>
      </dl>

      {brief?.languages.length ? (
        <div>
          <span style={LABEL_STYLE}>Langues principales</span>
          <p
            className="mt-1 leading-relaxed"
            style={{ color: "var(--afh-text)" }}
          >
            {brief.languages.join(" · ")}
          </p>
        </div>
      ) : null}

      {brief?.peoples.length ? (
        <div>
          <span style={LABEL_STYLE}>Peuples principaux</span>
          <p
            className="mt-1 leading-relaxed"
            style={{ color: "var(--afh-text)" }}
          >
            {brief.peoples.join(" · ")}
          </p>
        </div>
      ) : null}

      {documented === 0 ? (
        <span
          style={{
            fontSize: "var(--afh-text-small)",
            lineHeight: 1.65,
            color: "var(--afh-text-soft)",
          }}
        >
          Aucun peuple rattaché à ce pays dans le corpus.
        </span>
      ) : null}
    </div>
  );
}

// @req REQ-117
export function buildCountryTargetFacts(
  country: CountryDetail
): Partial<Record<CountryId, AtlasTargetFacts>> {
  const peoples = country.demographics?.peoples ?? country.majorPeoples ?? [];
  const names = peoples
    .map((entry) => entry.name)
    .filter((name): name is string => Boolean(name?.trim()));

  return {
    [country.id]: {
      title: country.nameCommonFr || country.nameFr,
      description: `${country.id} · frontière publiée, tracée à l'apparition`,
      body: (
        <div style={{ display: "grid", gap: 14 }}>
          <div>
            <span style={LABEL_STYLE}>Peuples déclarés par la fiche</span>
            <span style={NUMBER_STYLE}>{countFr.format(names.length)}</span>
          </div>

          {names.length > 0 ? (
            <div style={{ display: "grid", gap: 6 }}>
              <span style={LABEL_STYLE}>Premières entrées</span>
              <span
                style={{
                  fontSize: "var(--afh-text-small)",
                  lineHeight: 1.65,
                  color: "var(--afh-text-soft)",
                }}
              >
                {names.slice(0, NAMES_SHOWN).join(" · ")}
              </span>
            </div>
          ) : (
            <span
              style={{
                fontSize: "var(--afh-text-small)",
                lineHeight: 1.65,
                color: "var(--afh-text-soft)",
              }}
            >
              Aucun peuple rattaché à ce pays dans le corpus.
            </span>
          )}
        </div>
      ),
    },
  };
}

/**
 * Where the panel sends the reader. The fiche's own country is already on the
 * page, so it points at the parchment rather than reloading the route the
 * reader is standing on.
 *
 * It used to hand-set its own dress, and coloured its text with --accent —
 * the fill, which measures 3.10-4.39:1 and drops further under the hover
 * wash. AccessAxes moved off that ink for exactly this reason; the fix never
 * reached here because the two links shared no code. ActionLink takes
 * --accent-ink for all of them at once.
 */
function ReadTheFiche({ href }: { href: string }) {
  return <ActionLink href={href}>Lire la fiche complète</ActionLink>;
}

export interface CountryAtlasFactsInput {
  /** The fiche's own country, which gets the full panel. */
  country: CountryDetail;
  /** Everything the picker offers, named as the picker names it. */
  targets: AtlasTarget[];
  /** Documented peoples per country, from the corpus. */
  peopleCounts: Record<string, number>;
  /** Small factual records for every country offered by the picker. */
  countryBriefs: CountryAtlasBrief[];
}

/**
 * The panel's answer for every country the fiche's globe can be aimed at
 * (REQ-117).
 *
 * The fiche's own country keeps the full reading — the count, the first
 * entries. Every other country gets what the corpus knows about it and no
 * more: this globe is a way through the atlas, not a second fiche, and
 * inventing a richer panel for a country whose fiche is one click away would
 * be inventing content.
 *
 * Titles come from the targets rather than from the corpus, so the panel names
 * a country exactly as the picker that offered it did. The corpus stores the
 * declared name — "Republique algerienne democratique et populaire (...)" —
 * and the two must not disagree inside one control.
 */
/**
 * Where the country is, in the panel's own subtitle.
 *
 * The mockup states the centroid; what shipped stated the doctrine instead
 * ("frontiere publiee, tracee a l'apparition"), which explains why the line may
 * close rather than which country closed it. The charter is where the doctrine
 * belongs; a panel that has just flown the camera somewhere should say where.
 */
function placeOf(target: AtlasTarget): string {
  const { lat, lon } = target.center;
  const northSouth = `${Math.abs(lat).toFixed(1)}\u00b0 ${lat >= 0 ? "N" : "S"}`;
  const eastWest = `${Math.abs(lon).toFixed(1)}\u00b0 ${lon >= 0 ? "E" : "O"}`;
  return `${target.countryId} \u00b7 ${northSouth} \u00b7 ${eastWest}`;
}

// @req REQ-117
export function buildCountryAtlasFacts({
  country,
  targets,
  peopleCounts,
  countryBriefs,
}: CountryAtlasFactsInput): Partial<Record<CountryId, AtlasTargetFacts>> {
  const own = buildCountryTargetFacts(country);
  const briefsByCountry = new Map(
    countryBriefs.map((brief) => [brief.id, brief])
  );
  const ownSynthesis = deriveCountrySynthesisFromDetail(country);
  const ownBrief = briefsByCountry.get(country.id) ?? {
    id: country.id,
    nameFr: country.nameFr,
    officialName: country.nameOfficial,
    population: country.demographics?.totalPopulation,
    populationReferenceYear: country.demographics?.referenceYear,
    languages: ownSynthesis.languages.slice(0, 3),
    peoples: ownSynthesis.peoples.slice(0, 3).map((people) => people.name),
  };

  return Object.fromEntries(
    targets.map((target) => {
      if (target.countryId === country.id) {
        const ownFacts = own[country.id];
        const declared = (
          country.demographics?.peoples ??
          country.majorPeoples ??
          []
        ).filter((people) => Boolean(people.name?.trim())).length;
        return [
          target.countryId,
          {
            ...ownFacts,
            title: target.nameFr,
            description: placeOf(target),
            icon: flagFromISO3(target.countryId),
            body: (
              <div style={{ display: "grid", gap: 14 }}>
                <CountryBriefBody
                  brief={ownBrief}
                  documented={declared}
                  declared
                />
                <ProvenanceChip declared />
                <ReadTheFiche href="#fiche" />
              </div>
            ),
          },
        ];
      }

      const documented = peopleCounts[target.countryId] ?? 0;
      const brief = briefsByCountry.get(target.countryId);

      return [
        target.countryId,
        {
          title: target.nameFr,
          icon: flagFromISO3(target.countryId),
          description:
            brief?.officialName ||
            (documented === 1
              ? "1 peuple documenté"
              : `${countFr.format(documented)} peuples documentés`),
          body: (
            <div style={{ display: "grid", gap: 14 }}>
              <CountryBriefBody
                brief={brief}
                documented={documented}
                declared={false}
              />
              <ProvenanceChip declared={false} />
              <ReadTheFiche href={getCountryRoute("fr", target.countryId)} />
            </div>
          ),
        },
      ];
    })
  );
}
