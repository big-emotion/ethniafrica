import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import axe from "axe-core";

import { GazeEventNarrativeSection } from "../GazeEventNarrativeSection";
import type { MigrationNarrativeEntry } from "@/lib/migrationDataTransformer";
import { getPeopleRoute } from "@/lib/routing";

// axe-core is already a project dependency (used by scripts/a11y-test.ts via
// @axe-core/playwright); running it directly against the happy-dom render
// output gives the same rule engine as vitest-axe without a new package
// (ETNI-485 precedent, src/components/relations/__tests__/EgoNetworkGraph.test.tsx).
async function expectNoAxeViolations(container: Element): Promise<void> {
  const results = await axe.run(container);
  const summary = results.violations.map(
    (violation) =>
      `[${violation.impact}] ${violation.id}: ${violation.help} (${violation.nodes
        .map((node) => node.target.join(" "))
        .join(", ")})`
  );
  expect(summary).toEqual([]);
}

function makeEvent(
  overrides: Partial<MigrationNarrativeEntry> = {}
): MigrationNarrativeEntry {
  return {
    id: "MGR_TEST",
    nameMain: "Rébellion test",
    migrationGroup: null,
    eventType: "resistance",
    classificationStatus: "consensual",
    timeRange: { startYear: 1905, endYear: 1907, datingNote: null },
    peoples: [{ id: "PPL_TEST", nameMain: "Peuple Test", role: "resistance" }],
    paragraphs: [{ text: "Premier paragraphe.", confidence: null }],
    debate: null,
    sourceCount: 2,
    ...overrides,
  };
}

describe("GazeEventNarrativeSection", () => {
  // @req REQ-101 FR87 FR89
  it("renders the section title as a heading", () => {
    render(
      <GazeEventNarrativeSection
        eventType="resistance"
        events={[makeEvent()]}
        title="Résistances"
      />
    );
    expect(
      screen.getByRole("heading", { name: "Résistances", level: 2 })
    ).toBeInTheDocument();
  });

  // @req REQ-101 FR87 FR89
  it("renders every event's name, period and peoples endonym-first", () => {
    render(
      <GazeEventNarrativeSection
        eventType="resistance"
        events={[makeEvent()]}
        title="Résistances"
      />
    );
    expect(
      screen.getByRole("heading", { name: "Rébellion test" })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Peuple Test/ })).toHaveAttribute(
      "href",
      getPeopleRoute("fr", "PPL_TEST")
    );
  });

  // @req REQ-101 FR87 FR89
  it("renders every narrative paragraph with a ConfidenceChip", () => {
    render(
      <GazeEventNarrativeSection
        eventType="resistance"
        events={[
          makeEvent({
            paragraphs: [
              { text: "Premier paragraphe.", confidence: null },
              { text: "Second paragraphe.", confidence: null },
            ],
          }),
        ]}
        title="Résistances"
      />
    );
    expect(screen.getByText("Premier paragraphe.")).toBeInTheDocument();
    expect(screen.getByText("Second paragraphe.")).toBeInTheDocument();
    // ConfidenceChip degrades to "voir les sources" when confidence is null:
    // one per paragraph, plus MigrationEventCard's own hero chip.
    expect(
      screen.getAllByRole("link", { name: "voir les sources" })
    ).toHaveLength(3);
  });

  // @req REQ-101 FR87 FR89
  it("renders no ClassificationBadge for a consensual event", () => {
    render(
      <GazeEventNarrativeSection
        eventType="displacement"
        events={[makeEvent({ classificationStatus: "consensual" })]}
        title="Déplacements forcés"
      />
    );
    expect(screen.queryByTestId("classification-icon")).not.toBeInTheDocument();
  });

  // @req REQ-101 FR87 FR89 FR90
  it("renders a ClassificationBadge when a contested event card renders", () => {
    render(
      <GazeEventNarrativeSection
        eventType="resistance"
        events={[makeEvent({ classificationStatus: "contested" })]}
        title="Résistances"
      />
    );
    expect(screen.getByTestId("classification-icon")).toBeInTheDocument();
  });

  // @req REQ-101 FR89 FR90
  it("expands the multi-perspective debate text for a contested event", () => {
    render(
      <GazeEventNarrativeSection
        eventType="resistance"
        events={[
          makeEvent({
            classificationStatus: "contested",
            debate: "Le bilan humain reste débattu par l'historiographie.",
          }),
        ]}
        title="Résistances"
      />
    );
    expect(
      screen.getByText("Le bilan humain reste débattu par l'historiographie.")
    ).toBeInTheDocument();
    expect(screen.getByText("Débat historiographique")).toBeInTheDocument();
  });

  // @req REQ-101 FR89 FR90
  it("renders no debate section for a consensual event even if debate text is present", () => {
    render(
      <GazeEventNarrativeSection
        eventType="resistance"
        events={[
          makeEvent({
            classificationStatus: "consensual",
            debate: "Texte de débat orphelin.",
          }),
        ]}
        title="Résistances"
      />
    );
    expect(screen.queryByText("Texte de débat orphelin.")).toBeNull();
    expect(screen.queryByText("Débat historiographique")).toBeNull();
  });

  // @req REQ-101 FR90
  it("renders a DoctrineLinkCard in the section footer when an event is not consensual", () => {
    render(
      <GazeEventNarrativeSection
        eventType="resistance"
        events={[makeEvent({ classificationStatus: "contested" })]}
        title="Résistances"
      />
    );
    expect(screen.getByText("Lire la doctrine")).toBeInTheDocument();
  });

  // @req REQ-101 FR90
  it("renders no DoctrineLinkCard when every event is consensual", () => {
    render(
      <GazeEventNarrativeSection
        eventType="resistance"
        events={[makeEvent({ classificationStatus: "consensual" })]}
        title="Résistances"
      />
    );
    expect(screen.queryByText("Lire la doctrine")).toBeNull();
  });

  // @req REQ-101 FR87 FR89
  it("renders multiple events in the given order, complete without JS", () => {
    render(
      <GazeEventNarrativeSection
        eventType="resistance"
        events={[
          makeEvent({ id: "MGR_FIRST", nameMain: "Premier événement" }),
          makeEvent({ id: "MGR_SECOND", nameMain: "Second événement" }),
        ]}
        title="Résistances"
      />
    );
    const headings = screen.getAllByRole("heading", { level: 3 });
    expect(headings.map((h) => h.textContent)).toEqual([
      "Premier événement",
      "Second événement",
    ]);
  });

  // @req REQ-101 FR87 FR89
  it("renders a calm, distinct empty state per event type — no invented content", () => {
    const { rerender } = render(
      <GazeEventNarrativeSection
        eventType="displacement"
        events={[]}
        title="Déplacements forcés"
      />
    );
    expect(
      screen.getByText(/Aucun déplacement forcé n'est documenté/)
    ).toBeInTheDocument();

    rerender(
      <GazeEventNarrativeSection
        eventType="resistance"
        events={[]}
        title="Résistances"
      />
    );
    expect(
      screen.getByText(/Aucune résistance n'est documentée/)
    ).toBeInTheDocument();
  });

  // @req REQ-101 FR90
  it("renders no DoctrineLinkCard in the empty state", () => {
    render(
      <GazeEventNarrativeSection
        eventType="displacement"
        events={[]}
        title="Déplacements forcés"
      />
    );
    expect(screen.queryByText("Lire la doctrine")).toBeNull();
  });

  describe("Accessibility (axe)", () => {
    // @req REQ-101
    it("has no axe violations with populated events", async () => {
      const { container } = render(
        <GazeEventNarrativeSection
          eventType="resistance"
          events={[
            makeEvent({ classificationStatus: "consensual" }),
            makeEvent({
              id: "MGR_CONTESTED",
              classificationStatus: "contested",
              debate: "Débat test.",
            }),
          ]}
          title="Résistances"
        />
      );
      await expectNoAxeViolations(container);
    });

    // @req REQ-101
    it("has no axe violations in the empty state", async () => {
      const { container } = render(
        <GazeEventNarrativeSection
          eventType="displacement"
          events={[]}
          title="Déplacements forcés"
        />
      );
      await expectNoAxeViolations(container);
    });
  });
});
