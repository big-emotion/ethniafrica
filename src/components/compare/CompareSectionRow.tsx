/**
 * CompareSectionRow — Epic 9 Story 9.6 (ETNI-483).
 *
 * Mobile (< 720 px) text-first rendering of one comparable attribute: an
 * `<h2>` section title followed by a `<dl>` whose `<dt>` reads
 * "{row label} — {autonym}" for every entity, so a linearized reading order
 * still groups the values of one attribute together (FR59, FR61). Drops
 * itself when every entity's value for this row is empty — the transformer
 * (9.1) already filters rows null for every entity, but this component
 * re-asserts the rule defensively for any data passed to it directly.
 */

import { CompareValueCell } from "@/components/compare/CompareValueCell";
import type {
  CompareEntityType,
  ComparisonColumn,
  ComparisonRow,
} from "@/types/compare";
import type { Language } from "@/types/shared";

export interface CompareSectionRowProps {
  row: ComparisonRow;
  entities: ComparisonColumn[];
  entityType: CompareEntityType;
  language: Language;
}

// Editorial French row labels, one map per entity type (module spec
// epic-09-comparator.md notes the display order/labels are pending a
// content-owner pass before 9.6 freezes them — these reuse the section
// titles already shipped on the people/country/family detail pages).
const SECTION_TITLES: Record<CompareEntityType, Record<string, string>> = {
  peuple: {
    appellations: "Noms & appellations",
    origins: "Origines & formation",
    organization: "Peuples voisins & organisation",
    languages: "Langue",
    culture: "Culture & spiritualité",
    historicalRole: "Rôle historique",
    demography: "Répartition géographique",
  },
  pays: {
    historicalNames: "Noms à travers l'histoire",
    kingdoms: "Royaumes & Civilisations",
    majorPeoples: "Peuples & Démographie",
    culture: "Culture & Société",
    historicalFacts: "Faits historiques majeurs",
    demographics: "Peuples & Démographie",
  },
  famille: {
    decolonialHeader: "Appellations et décolonisation",
    generalInfo: "Informations générales",
    associatedPeoples: "Peuples associés",
    linguisticCharacteristics: "Caractéristiques linguistiques",
    historyAndOrigins: "Histoire et origines",
    distribution: "Répartition géographique",
  },
};

// @req REQ-098
export function getRowLabel(
  entityType: CompareEntityType,
  key: string
): string {
  return SECTION_TITLES[entityType]?.[key] ?? key;
}

// The demography rows carry a fixed "réf. 2025" caption (CLAUDE.md: 2025
// reference year) rather than a per-fiche referenceYear field, since the
// country-level demographics section does not carry one.
// @req REQ-098
export const DEMOGRAPHY_ROW_KEYS = new Set(["demography", "demographics"]);

function isEmptyRowValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object")
    return Object.keys(value as object).length === 0;
  return false;
}

// @req REQ-098
export function isRowEmpty(row: ComparisonRow): boolean {
  return Object.values(row.values).every(isEmptyRowValue);
}

// @req REQ-097 REQ-098
export function CompareSectionRow({
  row,
  entities,
  entityType,
  language,
}: CompareSectionRowProps) {
  if (isRowEmpty(row)) return null;

  const label = getRowLabel(entityType, row.key);
  const headingId = `compare-row-${row.key}`;
  const showReferenceYear = DEMOGRAPHY_ROW_KEYS.has(row.key);

  return (
    <section
      aria-labelledby={headingId}
      className="border-b border-afh-border py-afh-lg"
    >
      <h2 id={headingId} className="font-afh text-afh-h3 font-semibold">
        {label}
      </h2>
      <dl className="mt-afh-sm space-y-afh-md">
        {entities.map((entity) => (
          <div key={entity.id}>
            <dt className="font-afh text-afh-body font-semibold">
              {label} — {entity.label}
            </dt>
            <dd className="mt-1 font-afh text-afh-body text-afh-text">
              <CompareValueCell
                value={row.values[entity.id] ?? null}
                entity={entity}
                language={language}
                showReferenceYear={showReferenceYear}
              />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
