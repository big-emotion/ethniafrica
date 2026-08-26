import type { CSSProperties } from "react";

import type { AtlasTargetFacts } from "@/components/atlas/AtlasGlobe";
import type { AtlasTarget } from "@/lib/atlas/targets";

/**
 * What the globe's panel says when a reader picks one country of a family's
 * footprint.
 *
 * Every number here is derived — counted from the member peoples' declared
 * currentCountries — and none of it is stated by the family fiche, which
 * declares no distribution at all. The panel therefore ends on the derived
 * chip rather than opening with it: the reader gets the finding first and its
 * provenance immediately after, which is the order the rest of the atlas
 * follows too.
 */

export interface FamilyTargetFactsInput {
  familyId: string;
  familyNameFr: string;
  /** The family's own member count — never the sum of the per-country counts. */
  memberPeopleCount: number;
  /** Member peoples present in each country, by ISO 3166-1 alpha-3. */
  peopleNamesByCountry: Record<string, string[]>;
}

const NUMBER_STYLE: CSSProperties = {
  fontFamily: "var(--afh-font-mono)",
  fontSize: 30,
  fontWeight: 700,
  lineHeight: 1.1,
  color: "var(--afh-text)",
  fontVariantNumeric: "tabular-nums",
};

const LABEL_STYLE: CSSProperties = {
  fontSize: "var(--afh-text-caption)",
  letterSpacing: ".08em",
  textTransform: "uppercase",
  color: "var(--afh-text-muted)",
  fontWeight: 700,
};

const TRACK_STYLE: CSSProperties = {
  display: "block",
  height: 6,
  borderRadius: "var(--afh-radius-full)",
  background: "var(--afh-color-earth-bg, var(--afh-surface))",
  overflow: "hidden",
};

const CHIP_STYLE: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  padding: "4px 10px",
  borderRadius: "var(--afh-radius-full)",
  border: "1px solid var(--afh-border)",
  background: "var(--afh-surface)",
  fontSize: "var(--afh-text-nano)",
  color: "var(--afh-text-soft)",
};

const percentFr = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

// @req REQ-117
export function buildFamilyTargetFacts({
  familyId,
  familyNameFr,
  memberPeopleCount,
  peopleNamesByCountry,
}: FamilyTargetFactsInput): (target: AtlasTarget) => AtlasTargetFacts {
  return (target) => {
    const present = peopleNamesByCountry[target.countryId] ?? [];
    const share =
      memberPeopleCount > 0 ? (present.length / memberPeopleCount) * 100 : 0;

    return {
      title: target.nameFr,
      description: `${target.countryId} · part de l'empreinte ${familyNameFr}`,
      body: (
        <div style={{ display: "grid", gap: 14 }}>
          <div>
            <span style={LABEL_STYLE}>Peuples {familyNameFr} présents</span>
            <span style={{ ...NUMBER_STYLE, display: "block", marginTop: 4 }}>
              {present.length}
            </span>
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <span style={LABEL_STYLE}>
              Sur les {memberPeopleCount} de la famille
            </span>
            <span
              style={{
                fontFamily: "var(--afh-font-mono)",
                fontSize: "var(--afh-text-caption)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {percentFr.format(share)} %
            </span>
            <span style={TRACK_STYLE}>
              <span
                style={{
                  display: "block",
                  height: "100%",
                  width: `${share}%`,
                  background: "var(--accent)",
                }}
              />
            </span>
          </div>

          {present.length > 0 && (
            <div style={{ display: "grid", gap: 4 }}>
              <span style={LABEL_STYLE}>Parmi les plus répandus</span>
              <span style={{ lineHeight: 1.65 }}>{present.join(" · ")}</span>
            </div>
          )}

          <span style={CHIP_STYLE}>
            <span
              aria-hidden="true"
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--accent)",
              }}
            />
            Dérivé — non déclaré par la fiche famille
          </span>

          <a
            href="#fiche"
            style={{ color: "var(--accent-ink, var(--accent))" }}
            aria-label={`Lire la fiche complète de ${familyNameFr} (${familyId})`}
          >
            Lire la fiche complète →
          </a>
        </div>
      ),
    };
  };
}
