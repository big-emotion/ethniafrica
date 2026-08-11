/**
 * ComparisonView — Epic 9 Story 9.6 (ETNI-483).
 *
 * Server component orchestrator consuming `transformComparisonData` output
 * (9.1). Renders the comparison as two parallel semantic structures toggled
 * by CSS only (no client JS, SSR-first): a per-section `<dl>` stack for
 * < 800 px, and a real `<table>` for ≥ 800 px, so the text structure is the
 * primary DOM for every reader, not a fallback (FR59, FR61, FR43, FR44).
 *
 * `<th scope="col">` entity headers here are the minimal text-first form —
 * Story 9.7 (`CompareEntityHeader`) layers the `ConfidenceChip` /
 * `ClassificationBadge` presentation on top without changing this markup.
 */

import Link from "next/link";

import {
  CompareSectionRow,
  DEMOGRAPHY_ROW_KEYS,
  getRowLabel,
  isRowEmpty,
} from "@/components/compare/CompareSectionRow";
import { CompareValueCell } from "@/components/compare/CompareValueCell";
import { getCountryRoute, getFamilyRoute, getPeopleRoute } from "@/lib/routing";
import type { CompareEntityType, ComparisonPageData } from "@/types/compare";
import type { Language } from "@/types/shared";

export interface ComparisonViewProps {
  data: ComparisonPageData;
  language?: Language;
}

function entityRoute(
  type: CompareEntityType,
  id: string,
  language: Language
): string {
  if (type === "peuple") return getPeopleRoute(language, id);
  if (type === "pays") return getCountryRoute(language, id);
  return getFamilyRoute(language, id);
}

function joinLabels(labels: string[]): string {
  if (labels.length === 0) return "";
  if (labels.length === 1) return labels[0];
  return `${labels.slice(0, -1).join(", ")} et ${labels[labels.length - 1]}`;
}

// @req REQ-097 REQ-098
export function ComparisonView({ data, language = "fr" }: ComparisonViewProps) {
  const visibleRows = data.rows.filter((row) => !isRowEmpty(row));
  const caption = `Comparaison de ${joinLabels(data.columns.map((column) => column.label))}`;

  return (
    <div>
      {/* Sticky mini-header strip (< 800 px) — mirrors the table's column headers. */}
      <div className="sticky top-0 z-10 flex flex-wrap gap-afh-md border-b border-afh-border bg-afh-surface py-afh-sm min-[800px]:hidden">
        {data.columns.map((column) => (
          <Link
            key={column.id}
            href={entityRoute(column.type, column.id, language)}
            className="font-afh-display font-semibold text-afh-text"
          >
            {column.label}
          </Link>
        ))}
      </div>

      {/* < 800 px: per-section stacked definition lists. */}
      <div className="min-[800px]:hidden">
        {visibleRows.map((row) => (
          <CompareSectionRow
            key={row.key}
            row={row}
            entities={data.columns}
            entityType={data.type}
            language={language}
          />
        ))}
      </div>

      {/* ≥ 800 px: semantic table, scrollable in its own region so the body never scrolls horizontally. */}
      <div
        role="region"
        aria-label="Tableau de comparaison"
        tabIndex={0}
        className="hidden max-w-[800px] overflow-x-auto min-[800px]:mx-auto min-[800px]:block"
      >
        <table className="w-full border-collapse font-afh text-afh-body">
          <caption className="mb-afh-sm text-left font-afh-display text-afh-h3">
            {caption}
          </caption>
          <thead>
            <tr>
              <th scope="col" className="p-afh-sm text-left align-top">
                <span className="sr-only">Attribut comparé</span>
              </th>
              {data.columns.map((column) => (
                <th
                  key={column.id}
                  scope="col"
                  className="p-afh-sm text-left align-top"
                >
                  <Link
                    href={entityRoute(column.type, column.id, language)}
                    className="font-afh-display font-semibold underline underline-offset-2"
                  >
                    {column.label}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr key={row.key} className="border-t border-afh-border">
                <th
                  scope="row"
                  className="p-afh-sm text-left align-top font-semibold"
                >
                  {getRowLabel(data.type, row.key)}
                </th>
                {data.columns.map((column) => (
                  <td key={column.id} className="p-afh-sm align-top">
                    <CompareValueCell
                      value={row.values[column.id] ?? null}
                      entity={column}
                      language={language}
                      showReferenceYear={DEMOGRAPHY_ROW_KEYS.has(row.key)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ComparisonView;
