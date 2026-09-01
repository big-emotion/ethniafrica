import type { CSSProperties } from "react";

import type { AtlasTargetFacts } from "@/components/atlas/AtlasGlobe";
import { flagFromISO3 } from "@/lib/countryFlag";
import type { AtlasTarget } from "@/lib/atlas/targets";
import type { CountryId } from "@/types/afrik";
import type { CountryDetail } from "@/types/afrik-frontend";
import { getCountryRoute } from "@/lib/routing";
import { ActionLink } from "@/components/ui/ActionLink";

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

const BRIEF_GRID_STYLE: CSSProperties = {
  display: "grid",
  gap: "var(--afh-space-lg)",
  margin: 0,
};

const BRIEF_VALUE_STYLE: CSSProperties = {
  display: "block",
  margin: "var(--afh-space-xs) 0 0",
  fontSize: "var(--afh-text-small)",
  lineHeight: "var(--afh-leading-small)",
  color: "var(--afh-text)",
};

/**
 * The panel points into the fiche; the fiche lists the peoples in full, with
 * each name paired to its autonym. Naming them all twice would make the panel
 * a second, poorer listing of the same thing.
 */
const NAMES_SHOWN = 6;
const BRIEF_LANGUAGES_SHOWN = 3;

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

export interface CountryAtlasBrief {
  population?: number;
  referenceYear?: number;
  languages?: string[];
}

function principalLanguages(languages: string[] | undefined): string[] {
  const seen = new Set<string>();

  return (languages ?? [])
    .map((language) => language?.trim())
    .filter((language): language is string => {
      if (!language) return false;
      const key = language.toLocaleLowerCase("fr");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, BRIEF_LANGUAGES_SHOWN);
}

function CountryBriefFacts({ brief }: { brief?: CountryAtlasBrief }) {
  const population =
    typeof brief?.population === "number" &&
    Number.isFinite(brief.population) &&
    brief.population > 0
      ? brief.population
      : null;
  const referenceYear =
    typeof brief?.referenceYear === "number" &&
    Number.isFinite(brief.referenceYear) &&
    brief.referenceYear > 0
      ? brief.referenceYear
      : null;
  const languages = principalLanguages(brief?.languages);

  if (population === null && languages.length === 0) return null;

  return (
    <dl style={BRIEF_GRID_STYLE}>
      {population !== null && (
        <div>
          <dt style={LABEL_STYLE}>
            Population{referenceYear !== null ? ` · réf. ${referenceYear}` : ""}
          </dt>
          <dd
            style={{ ...BRIEF_VALUE_STYLE, fontVariantNumeric: "tabular-nums" }}
          >
            {countFr.format(population)}
          </dd>
        </div>
      )}

      {languages.length > 0 && (
        <div>
          <dt style={LABEL_STYLE}>Langues principales</dt>
          <dd style={BRIEF_VALUE_STYLE}>{languages.join(" · ")}</dd>
        </div>
      )}
    </dl>
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
  /** Compact corpus facts for each country, prepared by the server route. */
  countryBriefs?: Partial<Record<CountryId, CountryAtlasBrief>>;
}

/**
 * The panel's answer for every country the fiche's globe can be aimed at
 * (REQ-117).
 *
 * The fiche's own country keeps the full reading — the brief, the count, the
 * first entries. Every other country gets the same compact brief and its
 * documented-people count, but not a second people listing: this globe is a
 * way through the atlas, not a second fiche.
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
  countryBriefs = {},
}: CountryAtlasFactsInput): Partial<Record<CountryId, AtlasTargetFacts>> {
  const own = buildCountryTargetFacts(country);

  return Object.fromEntries(
    targets.map((target) => {
      if (target.countryId === country.id) {
        const ownFacts = own[country.id];
        return [
          target.countryId,
          {
            ...ownFacts,
            title: target.nameFr,
            description: placeOf(target),
            icon: flagFromISO3(target.countryId),
            body: (
              <div style={{ display: "grid", gap: 14 }}>
                <CountryBriefFacts brief={countryBriefs[target.countryId]} />
                {ownFacts?.body}
                <ProvenanceChip declared />
                <ReadTheFiche href="#fiche" />
              </div>
            ),
          },
        ];
      }

      const documented = peopleCounts[target.countryId] ?? 0;

      return [
        target.countryId,
        {
          title: target.nameFr,
          icon: flagFromISO3(target.countryId),
          description:
            documented === 1
              ? "1 peuple documenté"
              : `${countFr.format(documented)} peuples documentés`,
          body: (
            <div style={{ display: "grid", gap: 14 }}>
              <CountryBriefFacts brief={countryBriefs[target.countryId]} />
              {documented === 0 && (
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
              <ProvenanceChip declared={false} />
              <ReadTheFiche href={getCountryRoute("fr", target.countryId)} />
            </div>
          ),
        },
      ];
    })
  );
}
