/**
 * Tests for NameOriginCard (ETNI-472 / Epic 8 Story 8.8).
 *
 * The card MUST:
 *   - render the name text with `lang={languageOfOrigin}` when present (UX-DR38),
 *   - require and render its `confidenceChip` slot (UX-DR49 #2),
 *   - render imposition context (imposedBy, impositionPeriod, whyProblematic,
 *     contemporaryUsage) only when provided,
 *   - render available fields without placeholders when optional fields are
 *     missing (no meaning, no ISO code) — never throw, never invent.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NameOriginCard } from "@/components/names/NameOriginCard";
import type { NameRecordView } from "@/types/names";

const baseRecord: NameRecordView = {
  nameText: "Kongo",
  nameType: "endonym",
  languageOfOrigin: "kon",
  meaning: "peuple du fleuve",
  periodLabel: null,
  imposedBy: null,
  impositionPeriod: null,
  whyProblematic: null,
  contemporaryUsage: null,
};

describe("NameOriginCard", () => {
  // @req REQ-056
  it("renders the name text with the lang attribute when languageOfOrigin is present", () => {
    render(
      <NameOriginCard record={baseRecord} confidenceChip={<span>chip</span>} />
    );
    const name = screen.getByText("Kongo");
    // `kon` is what the corpus stores; `kg` is what BCP 47 asks the page to
    // carry, and what assistive tech resolves.
    expect(name).toHaveAttribute("lang", "kg");
  });

  // @req REQ-057
  it("renders the required confidenceChip slot", () => {
    render(
      <NameOriginCard
        record={baseRecord}
        confidenceChip={<span data-testid="the-chip">chip</span>}
      />
    );
    expect(screen.getByTestId("the-chip")).toBeInTheDocument();
  });

  // @req REQ-056
  it("renders the meaning when provided", () => {
    render(
      <NameOriginCard record={baseRecord} confidenceChip={<span>chip</span>} />
    );
    expect(screen.getByText(/peuple du fleuve/)).toBeInTheDocument();
  });

  // @req REQ-056
  it("renders imposition context when provided", () => {
    const imposedRecord: NameRecordView = {
      ...baseRecord,
      nameType: "exonym",
      imposedBy: "administration coloniale",
      impositionPeriod: "1908-1960",
      whyProblematic: "efface l'auto-appellation",
      contemporaryUsage: "encore utilisé administrativement",
    };
    render(
      <NameOriginCard
        record={imposedRecord}
        confidenceChip={<span>chip</span>}
      />
    );
    expect(screen.getByText(/administration coloniale/)).toBeInTheDocument();
    expect(screen.getByText(/1908-1960/)).toBeInTheDocument();
    expect(screen.getByText(/efface l'auto-appellation/)).toBeInTheDocument();
    expect(
      screen.getByText(/encore utilisé administrativement/)
    ).toBeInTheDocument();
    expect(screen.getByText("nom imposé")).toBeInTheDocument();
  });

  // @req REQ-056
  it("renders without a lang attribute when languageOfOrigin is missing, without throwing", () => {
    const record: NameRecordView = {
      ...baseRecord,
      languageOfOrigin: null,
    };
    expect(() =>
      render(
        <NameOriginCard record={record} confidenceChip={<span>chip</span>} />
      )
    ).not.toThrow();
    const name = screen.getByText("Kongo");
    expect(name).not.toHaveAttribute("lang");
  });

  // @req REQ-056
  it("renders available fields without placeholders when meaning is missing", () => {
    const record: NameRecordView = { ...baseRecord, meaning: null };
    render(
      <NameOriginCard record={record} confidenceChip={<span>chip</span>} />
    );
    expect(screen.getByText("Kongo")).toBeInTheDocument();
    expect(screen.queryByText(/peuple du fleuve/)).toBeNull();
    expect(screen.queryByText(/null/i)).toBeNull();
    expect(screen.queryByText(/undefined/i)).toBeNull();
  });

  // @req REQ-056
  it("does not render imposition context when no imposition fields are provided", () => {
    render(
      <NameOriginCard record={baseRecord} confidenceChip={<span>chip</span>} />
    );
    expect(screen.queryByText("nom imposé")).toBeNull();
  });
});
