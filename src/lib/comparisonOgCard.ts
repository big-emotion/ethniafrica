/**
 * Comparison OG card — pure data prep (FR63, AR30).
 *
 * Turns an already-assembled `ComparisonPageData` into the flat, render-ready
 * shape the `opengraph-image.tsx` route draws. No I/O here: confidence must
 * already be attached to each column (or absent, which is the honest
 * "fiche non auditée" case — Source Tier policy forbids fabricating a score).
 */

import type { ComparisonColumn, ComparisonPageData } from "@/types/compare";
import { PRODUCT_NAME, ATTRIBUTION_STRING } from "@/lib/brand";

// @req REQ-097
export const AUTONYM_CHAR_BUDGET = 28;

const UNAUDITED_LABEL = "fiche non auditée";

const ENTITY_TYPE_LABELS: Record<ComparisonPageData["type"], string> = {
  peuple: "Peuples",
  pays: "Pays",
  famille: "Familles linguistiques",
};

const AUTONYM_ROW_KEY_BY_TYPE: Partial<
  Record<ComparisonPageData["type"], string>
> = {
  peuple: "appellations",
  famille: "decolonialHeader",
};

export interface OgCardEntity {
  id: string;
  autonym: string;
  exonym: string | null;
  confidenceLabel: string;
}

export interface OgCardProps {
  entityTypeLabel: string;
  entities: OgCardEntity[];
  productName: string;
  attribution: string;
}

function truncate(value: string, budget: number): string {
  if (value.length <= budget) return value;
  return `${value.slice(0, budget - 1)}…`;
}

function findRowValue(
  data: ComparisonPageData,
  key: string,
  entityId: string
): unknown | null {
  const row = data.rows.find((candidate) => candidate.key === key);
  return row?.values[entityId] ?? null;
}

function resolveAutonymExonym(
  data: ComparisonPageData,
  column: ComparisonColumn
): { autonym: string; exonym: string | null } {
  const rowKey = AUTONYM_ROW_KEY_BY_TYPE[data.type];
  if (!rowKey) {
    return { autonym: column.label, exonym: null };
  }

  if (data.type === "peuple") {
    const appellations = findRowValue(data, rowKey, column.id) as {
      selfAppellation?: string;
      exonyms?: string[];
    } | null;
    return {
      autonym: appellations?.selfAppellation || column.label,
      exonym: appellations?.exonyms?.[0] ?? null,
    };
  }

  const decolonialHeader = findRowValue(data, rowKey, column.id) as {
    selfAppellation?: string;
    historicalAppellations?: string[];
  } | null;
  return {
    autonym: decolonialHeader?.selfAppellation || column.label,
    exonym: decolonialHeader?.historicalAppellations?.[0] ?? null,
  };
}

function resolveConfidenceLabel(column: ComparisonColumn): string {
  const score = column.confidence?.score;
  if (typeof score !== "number") return UNAUDITED_LABEL;
  return `${Math.round(score * 100)} % de confiance`;
}

// @req REQ-097
export function buildComparisonOgCard(data: ComparisonPageData): OgCardProps {
  const entities: OgCardEntity[] = data.columns.map((column) => {
    const { autonym, exonym } = resolveAutonymExonym(data, column);
    return {
      id: column.id,
      autonym: truncate(autonym, AUTONYM_CHAR_BUDGET),
      exonym,
      confidenceLabel: resolveConfidenceLabel(column),
    };
  });

  return {
    entityTypeLabel: ENTITY_TYPE_LABELS[data.type],
    entities,
    productName: PRODUCT_NAME,
    attribution: ATTRIBUTION_STRING,
  };
}
