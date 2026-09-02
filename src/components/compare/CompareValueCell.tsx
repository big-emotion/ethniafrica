/**
 * CompareValueCell — Epic 9 Story 9.6 (ETNI-483).
 *
 * Renders one comparable value for one entity: the fiche value verbatim
 * (no client-side normalization, no invented figures), a link when the
 * value is a relational fiche identifier, or the "non renseigné" state
 * with sr-only entity context (FR61). Carries no business logic beyond
 * generic AFRIK-id detection and presentational recursion (UX-DR48) — it
 * has no knowledge of which comparable row it is rendering.
 */

import Link from "next/link";
import type { ReactNode } from "react";

import { getCountryRoute, getFamilyRoute, getPeopleRoute } from "@/lib/routing";
import type { ComparisonColumn } from "@/types/compare";
import type { Language } from "@/types/shared";

export interface CompareValueCellProps {
  value: unknown;
  entity: ComparisonColumn;
  language?: Language;
  /** Set by CompareSectionRow for demography-shaped rows only (FR61). */
  showReferenceYear?: boolean;
}

// AFRIK identifier shapes (see CLAUDE.md): peoples PPL_xxx, families FLG_xxx,
// countries ISO 3166-1 alpha-3. Detecting these structurally lets every
// relational field (top-level or nested) resolve to a fiche link without a
// bespoke renderer per comparable section (FR4 navigation continuity).
const PEOPLE_ID_PATTERN = /^PPL_[A-Z0-9_]+$/;
const FAMILY_ID_PATTERN = /^FLG_[A-Z0-9_]+$/;
const COUNTRY_ID_PATTERN = /^[A-Z]{3}$/;

function routeForId(id: string, language: Language): string | null {
  if (PEOPLE_ID_PATTERN.test(id)) return getPeopleRoute(language, id);
  if (FAMILY_ID_PATTERN.test(id)) return getFamilyRoute(language, id);
  if (COUNTRY_ID_PATTERN.test(id)) return getCountryRoute(language, id);
  return null;
}

function humanizeKey(key: string): string {
  return key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();
}

function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object")
    return Object.keys(value as object).length === 0;
  return false;
}

function renderScalar(
  value: string | number | boolean,
  language: Language
): ReactNode {
  if (typeof value !== "string") return String(value);

  const href = routeForId(value, language);
  if (href) {
    return (
      <Link href={href} className="underline underline-offset-2">
        {value}
      </Link>
    );
  }
  return value;
}

function renderList(values: unknown[], language: Language): ReactNode {
  return (
    <ul className="list-inside list-disc space-y-1">
      {values.map((item, index) => (
        <li key={index}>{renderValue(item, language)}</li>
      ))}
    </ul>
  );
}

function renderRecord(
  record: Record<string, unknown>,
  language: Language
): ReactNode {
  const entries = Object.entries(record).filter(([, v]) => !isEmptyValue(v));
  if (entries.length === 0) return null;

  // A record whose own keys are themselves AFRIK ids (e.g. a
  // distributionByCountry map keyed by country code) links the key instead
  // of humanizing it.
  const keysAreIds = entries.every(
    ([key]) => routeForId(key, language) !== null
  );

  return (
    <dl className="space-y-1">
      {entries.map(([key, v]) => {
        const idHref = keysAreIds ? routeForId(key, language) : null;
        return (
          <div key={key}>
            <dt className="inline font-semibold">
              {idHref ? (
                <Link href={idHref} className="underline underline-offset-2">
                  {key}
                </Link>
              ) : (
                humanizeKey(key)
              )}
              {": "}
            </dt>
            <dd className="inline">{renderValue(v, language)}</dd>
          </div>
        );
      })}
    </dl>
  );
}

function renderValue(value: unknown, language: Language): ReactNode {
  if (isEmptyValue(value)) return null;
  if (Array.isArray(value)) return renderList(value, language);
  if (typeof value === "object") {
    return renderRecord(value as Record<string, unknown>, language);
  }
  return renderScalar(value as string | number | boolean, language);
}

// @req REQ-098
export function CompareValueCell({
  value,
  entity,
  language = "fr",
  showReferenceYear = false,
}: CompareValueCellProps) {
  if (isEmptyValue(value)) {
    return (
      <span className="bg-afh-bg-warm px-1 text-afh-text-soft">
        non renseigné
        <span className="sr-only"> pour {entity.label}</span>
      </span>
    );
  }

  return (
    <>
      {renderValue(value, language)}
      {showReferenceYear && (
        <p className="mt-1 text-afh-caption text-afh-text-soft">réf. 2025</p>
      )}
    </>
  );
}
