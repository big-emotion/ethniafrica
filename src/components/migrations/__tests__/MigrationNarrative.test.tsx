import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MigrationNarrative } from "../MigrationNarrative";
import type { MigrationNarrativeEntry } from "@/lib/migrationDataTransformer";
import { getPeopleRoute } from "@/lib/routing";

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
    paragraphs: [{ text: "Premier paragraphe.", confidence: null }],
    debate: null,
    sourceCount: 2,
    ...overrides,
  };
}

// @req FR81 FR82 FR78
describe("MigrationNarrative", () => {
  // @req REQ-101 FR81 FR82 FR78
  it("renders every event's name, period and peoples via MigrationEventCard", () => {
    render(<MigrationNarrative language="fr" events={[makeEvent()]} />);
    expect(
      screen.getByRole("heading", { name: "Expansion test" })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Peuple Test/ })).toHaveAttribute(
      "href",
      getPeopleRoute("fr", "PPL_TEST")
    );
  });

  // @req REQ-101 FR81 FR82 FR78
  it("renders every paragraph of the narrative text", () => {
    render(
      <MigrationNarrative
        language="fr"
        events={[
          makeEvent({
            paragraphs: [
              { text: "Premier paragraphe.", confidence: null },
              { text: "Second paragraphe.", confidence: null },
            ],
          }),
        ]}
      />
    );
    expect(screen.getByText("Premier paragraphe.")).toBeInTheDocument();
    expect(screen.getByText("Second paragraphe.")).toBeInTheDocument();
  });

  // @req REQ-101 FR81 FR82 FR78
  it("degrades a paragraph's confidence indicator to a 'voir les sources' link when confidence is missing", () => {
    render(
      <MigrationNarrative
        language="fr"
        events={[
          makeEvent({
            paragraphs: [{ text: "Sans confiance.", confidence: null }],
          }),
        ]}
      />
    );
    const paragraph = screen.getByText("Sans confiance.").closest("p");
    expect(
      within(paragraph as HTMLElement).getByRole("link", {
        name: "voir les sources",
      })
    ).toBeInTheDocument();
  });

  // @req REQ-101 FR81 FR82 FR78
  it("renders the full confidence pill for a paragraph with complete confidence data", () => {
    render(
      <MigrationNarrative
        language="fr"
        events={[
          makeEvent({
            paragraphs: [
              {
                text: "Avec confiance.",
                confidence: {
                  score: 85,
                  sourceCount: 3,
                  lastHumanAuditAt: "2026-01-01",
                },
              },
            ],
          }),
        ]}
      />
    );
    const paragraph = screen.getByText(/Avec confiance\./).closest("p");
    expect(
      within(paragraph as HTMLElement).getByText(/85 %/)
    ).toBeInTheDocument();
  });

  // @req REQ-101 FR81 FR82 FR78
  it("renders debate text for a contested event", () => {
    render(
      <MigrationNarrative
        language="fr"
        events={[
          makeEvent({
            classificationStatus: "contested",
            debate: "Les historiens ne s'accordent pas sur la datation.",
          }),
        ]}
      />
    );
    expect(
      screen.getByText("Les historiens ne s'accordent pas sur la datation.")
    ).toBeInTheDocument();
    expect(screen.getByText("Débat historiographique")).toBeInTheDocument();
  });

  /**
   * The page above this component is a PageLayout, whose title is the only h1
   * on the route. Opening the narrative at h3 skipped h2 entirely, which
   * Lighthouse scored as a `heading-order` failure (accessibility 0.98 against
   * a required 1.0) on /fr/dossiers/migrations. axe stayed green on the same
   * tree because the live-route gate only reports `serious` and `critical`, and
   * `heading-order` is `moderate` — so this contract is asserted here, where it
   * cannot pass by being filtered out.
   *
   * MigrationEventCard keeps h3 by default: on the colonization page it sits
   * under an h2 section, where h3 is the correct level.
   */
  // @req REQ-101 FR81 FR82 FR78
  it("opens each event at h2 so the page's h1 is not followed by an h3", () => {
    render(
      <MigrationNarrative
        language="fr"
        events={[
          makeEvent({
            classificationStatus: "contested",
            debate: "Les historiens ne s'accordent pas sur la datation.",
          }),
        ]}
      />
    );

    expect(
      screen.getByRole("heading", { name: "Expansion test", level: 2 })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Débat historiographique", level: 3 })
    ).toBeInTheDocument();
  });

  // @req REQ-101 FR81 FR82 FR78
  it("renders no debate section for a consensual event, even if debate text is present", () => {
    render(
      <MigrationNarrative
        language="fr"
        events={[
          makeEvent({
            classificationStatus: "consensual",
            debate: "Texte de débat orphelin.",
          }),
        ]}
      />
    );
    expect(screen.queryByText("Texte de débat orphelin.")).toBeNull();
    expect(screen.queryByText("Débat historiographique")).toBeNull();
  });

  // @req REQ-101 FR81 FR82 FR78
  it("renders no debate section for a contested event with no debate text", () => {
    render(
      <MigrationNarrative
        language="fr"
        events={[
          makeEvent({ classificationStatus: "contested", debate: null }),
        ]}
      />
    );
    expect(screen.queryByText("Débat historiographique")).toBeNull();
  });

  // @req REQ-101 FR81 FR82 FR78
  it("renders multiple events in the given order, complete without JS", () => {
    render(
      <MigrationNarrative
        language="fr"
        events={[
          makeEvent({ id: "MGR_FIRST", nameMain: "Premier événement" }),
          makeEvent({ id: "MGR_SECOND", nameMain: "Second événement" }),
        ]}
      />
    );
    // Each event opens at h2; the linked-people chips inside a card are h2 too,
    // so the event titles are picked out by name rather than by level alone.
    const headings = screen.getAllByRole("heading", {
      level: 2,
      name: /événement/,
    });
    expect(headings.map((h) => h.textContent)).toEqual([
      "Premier événement",
      "Second événement",
    ]);
  });

  // The narrative sits in the same chapter as the atlas and the chronology
  // table, both of which fill their container. Held to 75ch, the paragraphs
  // were the only thing on a desktop page that stopped mid-width.
  // @req REQ-101 FR81 FR82 FR78
  it("gives the narrative paragraphs no measure of their own", () => {
    const { container } = render(
      <MigrationNarrative
        language="fr"
        events={[
          makeEvent({
            classificationStatus: "contested",
            debate: "Les datations divergent.",
          }),
        ]}
      />
    );

    const paragraphs = Array.from(container.querySelectorAll("p"));
    expect(paragraphs.length).toBeGreaterThan(1);
    expect(paragraphs.every((p) => !/max-w-/.test(p.className))).toBe(true);
  });

  // @req REQ-101 FR81 FR82 FR78
  it("renders an empty state when there are no events", () => {
    render(<MigrationNarrative language="fr" events={[]} />);
    expect(
      screen.getByText("Aucune migration ne correspond à ce filtre.")
    ).toBeInTheDocument();
  });
});
