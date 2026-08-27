import type { CSSProperties } from "react";

import type { AtlasTargetFacts } from "@/components/atlas/AtlasGlobe";
import type { CountryId } from "@/types/afrik";
import type { CountryDetail } from "@/types/afrik-frontend";

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

const countFr = new Intl.NumberFormat("fr-FR");

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
            <span style={LABEL_STYLE}>Peuples au corpus</span>
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
