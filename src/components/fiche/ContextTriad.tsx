/**
 * ContextTriad — Epic 15 · Story 15.10 (ETNI-818 · FR103).
 *
 * Every fiche carries a sticky (top 0) bar stating its position in the AFRIK
 * hierarchy: Family, the entity itself, and Country. Cardinality drives the
 * form per node:
 *
 * - The fiche's own entity is never a link — a "you are here" marker
 *   (`aria-current="location"`).
 * - A people has exactly one family and 1..n countries: both resolve to
 *   direct chips, because both sets are small enough to name.
 * - A country or a language family has no small, nameable set on the other
 *   axis (a country's peoples can run into the hundreds) — that axis becomes
 *   a counter anchoring to the chapter where the payload actually lists them
 *   (The Record), never a wall of chips.
 *
 * A node whose data is missing is absent, never guessed (FR98): an
 * unresolved family renders no family chip, an empty country list renders no
 * country chips, a zero/absent count renders no counter.
 *
 * No extra query: every label comes from the payload the panels already
 * fetch (`FichePanelContext`), consistent with the Source Tier Policy — this
 * component never asserts a fact it cannot back.
 */

import type { ReactNode } from "react";

import { sectionIdForPanel, type FichePanelContext } from "./panelRegistry";
import { getFrenchCountryCommonName } from "@/lib/countryNames";
import { getCountryRoute, getFamilyRoute } from "@/lib/routing";
import type { Language } from "@/types/shared";
import { cn } from "@/lib/utils";

export interface ContextTriadProps {
  context: FichePanelContext;
  /** Only "fr" is implemented today (src/types/shared.ts). */
  language?: Language;
  className?: string;
}

type TriadKind = "family" | "entity" | "country" | "people";
type TriadVariant = "chip" | "current" | "counter";

interface TriadItem {
  key: string;
  kind: TriadKind;
  variant: TriadVariant;
  label: string;
  href?: string;
}

const RECORD_ANCHOR = `#${sectionIdForPanel("record")}`;

function itemsFor(context: FichePanelContext, language: Language): TriadItem[] {
  switch (context.entityType) {
    case "people": {
      const { payload } = context;
      const items: TriadItem[] = [];

      if (payload.languageFamilyId) {
        items.push({
          key: "family",
          kind: "family",
          variant: "chip",
          label: payload.languageFamilyName || payload.languageFamilyId,
          href: getFamilyRoute(language, payload.languageFamilyId),
        });
      }

      items.push({
        key: "entity",
        kind: "entity",
        variant: "current",
        label: payload.nameMain,
      });

      const countries = payload.currentCountries ?? [];
      countries.forEach((iso3) => {
        items.push({
          key: `country-${iso3}`,
          kind: "country",
          variant: "chip",
          label: getFrenchCountryCommonName(iso3, iso3),
          href: getCountryRoute(language, iso3),
        });
      });

      return items;
    }

    case "country": {
      const { payload } = context;
      const items: TriadItem[] = [];
      const peopleCount = payload.majorPeoples?.length ?? 0;

      if (peopleCount > 0) {
        items.push({
          key: "people",
          kind: "people",
          variant: "counter",
          label: `${peopleCount} peuple${peopleCount > 1 ? "s" : ""}`,
          href: RECORD_ANCHOR,
        });
      }

      items.push({
        key: "entity",
        kind: "entity",
        variant: "current",
        label: payload.nameCommonFr || payload.nameFr,
      });

      return items;
    }

    case "language-family": {
      const { payload } = context;
      const items: TriadItem[] = [];

      items.push({
        key: "entity",
        kind: "entity",
        variant: "current",
        label: payload.nameFr,
      });

      const peopleCount = payload.associatedPeoples?.length ?? 0;
      if (peopleCount > 0) {
        items.push({
          key: "people",
          kind: "people",
          variant: "counter",
          label: `${peopleCount} peuple${peopleCount > 1 ? "s" : ""}`,
          href: RECORD_ANCHOR,
        });
      }

      return items;
    }
  }
}

const CHIP_CLASS = cn(
  "flex min-h-[var(--afh-tree-node-min-h)] items-center gap-1 rounded-full border px-3 py-1",
  "font-afh text-afh-small no-underline",
  "border-afh-border bg-afh-surface text-afh-text hover:bg-afh-bg-warm",
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-afh-gold focus-visible:ring-offset-2"
);

const CURRENT_CLASS =
  "flex min-h-[var(--afh-tree-node-min-h)] items-center gap-1 rounded-full px-3 py-1 font-afh text-afh-small font-semibold text-afh-text";

function TriadNode({ item }: { item: TriadItem }): ReactNode {
  if (item.variant === "current") {
    return (
      <span className={CURRENT_CLASS}>
        <span aria-current="location">{item.label}</span>
      </span>
    );
  }

  return (
    <a href={item.href} className={CHIP_CLASS}>
      {item.label}
    </a>
  );
}

// @req REQ-091
export function ContextTriad({
  context,
  language = "fr",
  className,
}: ContextTriadProps) {
  const items = itemsFor(context, language);

  return (
    <nav
      aria-label="Position dans la hiérarchie AFRIK"
      data-context-triad
      data-context-triad-entity={context.entityType}
      className={cn(
        "sticky top-0 z-40 flex flex-wrap items-center gap-afh-md",
        "bg-afh-surface/95 px-afh-lg py-afh-sm backdrop-blur supports-[backdrop-filter]:bg-afh-surface/80",
        className
      )}
    >
      <ol className="flex flex-wrap items-center gap-afh-md">
        {items.map((item) => (
          <li
            key={item.key}
            data-context-triad-item
            data-context-triad-kind={item.kind}
            data-context-triad-variant={item.variant}
          >
            <TriadNode item={item} />
          </li>
        ))}
      </ol>
    </nav>
  );
}
