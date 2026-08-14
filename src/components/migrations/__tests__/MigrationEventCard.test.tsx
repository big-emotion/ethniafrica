import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MigrationEventCard } from "../MigrationEventCard";
import type { MigrationNarrativeEntry } from "@/lib/migrationDataTransformer";

function makeEvent(
  overrides: Partial<MigrationNarrativeEntry> = {}
): MigrationNarrativeEntry {
  return {
    id: "MGR_TEST",
    nameMain: "Expansion test",
    migrationGroup: null,
    eventType: "expansion",
    classificationStatus: "consensual",
    timeRange: { startYear: -500, endYear: 200, datingNote: null },
    peoples: [{ id: "PPL_TEST", nameMain: "Peuple Test", role: "origin" }],
    paragraphs: [],
    debate: null,
    sourceCount: 2,
    ...overrides,
  };
}

// @req FR81 FR82
describe("MigrationEventCard", () => {
  // @req REQ-101 FR81 FR82
  it("renders the event name in the Fraunces display font", () => {
    render(<MigrationEventCard event={makeEvent()} />);
    const heading = screen.getByRole("heading", { name: "Expansion test" });
    expect(heading.className).toContain("font-afh-display");
  });

  // @req REQ-101 FR81 FR82
  it("renders the French-formatted period from startYear/endYear", () => {
    render(<MigrationEventCard event={makeEvent()} />);
    expect(screen.getByText(/500 av\. J\.-C\./)).toBeInTheDocument();
    expect(screen.getByText(/200/)).toBeInTheDocument();
  });

  // @req REQ-101 FR81 FR82
  it("links each people via AutonymExonymHeading to /fr/peuples/{slug}", () => {
    render(<MigrationEventCard event={makeEvent()} />);
    const link = screen.getByRole("link", { name: /Peuple Test/ });
    expect(link).toHaveAttribute("href", "/fr/peuples/PPL_TEST");
  });

  // @req REQ-101 FR81 FR82
  it("renders the ClassificationBadge for a contested event", () => {
    render(
      <MigrationEventCard
        event={makeEvent({ classificationStatus: "contested" })}
      />
    );
    expect(screen.getByText("Contesté")).toBeInTheDocument();
  });

  // @req REQ-101 FR81 FR82
  it("renders no ClassificationBadge for a consensual event", () => {
    render(
      <MigrationEventCard
        event={makeEvent({ classificationStatus: "consensual" })}
      />
    );
    expect(screen.queryByText("Contesté")).not.toBeInTheDocument();
  });

  // @req REQ-101 FR81 FR82
  it("shows a phase indicator when migrationGroup is set", () => {
    render(
      <MigrationEventCard
        event={makeEvent({ migrationGroup: "bantu-expansion" })}
      />
    );
    expect(screen.getByText(/bantu-expansion/)).toBeInTheDocument();
  });

  // @req REQ-101 FR81 FR82
  it("shows no phase indicator when migrationGroup is null", () => {
    render(<MigrationEventCard event={makeEvent({ migrationGroup: null })} />);
    expect(screen.queryByTestId("migration-phase-indicator")).toBeNull();
  });

  // @req REQ-101 FR81 FR82
  it("degrades the confidence indicator to a 'voir les sources' link when no confidence data is given", () => {
    render(<MigrationEventCard event={makeEvent()} />);
    expect(
      screen.getByRole("link", { name: "voir les sources" })
    ).toBeInTheDocument();
  });

  // @req REQ-101 FR81 FR82
  it("renders the full confidence pill when confidence data is complete", () => {
    render(
      <MigrationEventCard
        event={makeEvent()}
        confidence={{
          score: 90,
          sourceCount: 4,
          lastHumanAuditAt: "2026-02-01",
        }}
      />
    );
    expect(screen.getByText(/90 %/)).toBeInTheDocument();
  });

  // @req REQ-101 FR81 FR82
  it("degrades gracefully with no peoples", () => {
    render(<MigrationEventCard event={makeEvent({ peoples: [] })} />);
    expect(screen.queryByRole("link", { name: /Peuple/ })).toBeNull();
  });
});
