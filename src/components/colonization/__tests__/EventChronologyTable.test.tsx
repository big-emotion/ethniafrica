import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";

import { EventChronologyTable } from "../EventChronologyTable";
import type { ColonizationTimelineEntry } from "@/lib/colonizationDataTransformer";

afterEach(() => cleanup());

const resistanceEntry: ColonizationTimelineEntry = {
  id: "MGR_MAJI_MAJI_REBELLION",
  nameMain: "Rébellion Maji Maji",
  eventType: "resistance",
  classificationStatus: "contested",
  timeRange: { startYear: 1905, endYear: 1907, datingNote: null },
  peoples: [
    {
      id: "PPL_MATUMBI",
      nameMain: "Matumbi",
      endonym: "Matumbi",
      endonymLanguage: "mgw",
    },
    {
      id: "PPL_NGONI",
      nameMain: "Ngoni",
      endonym: null,
      endonymLanguage: null,
    },
  ],
  place: null,
  primarySource: {
    title: "UNESCO General History of Africa",
    url: "https://example.org/unesco",
  },
};

const imposedNameEntry: ColonizationTimelineEntry = {
  id: "MGR_YORUBA_NAGO_COLONIAL_EXONYM",
  nameMain: "Exonyme colonial « Nago »",
  eventType: "imposed_name",
  classificationStatus: "colonial-legacy",
  timeRange: { startYear: 1850, endYear: 1850, datingNote: null },
  peoples: [
    {
      id: "PPL_YORUBA",
      nameMain: "Yoruba",
      endonym: null,
      endonymLanguage: null,
    },
  ],
  place: null,
  primarySource: null,
};

// @req REQ-101 FR87
describe("EventChronologyTable (Epic 13, Story 13.12, ETNI-536)", () => {
  // @req REQ-101 FR87
  it("renders a semantic table with one row per event", () => {
    render(
      <EventChronologyTable
        language="fr"
        events={[imposedNameEntry, resistanceEntry]}
      />
    );
    const table = screen.getByRole("table", {
      name: "Chronologie des événements coloniaux",
    });
    const rows = within(table).getAllByRole("row");
    // header row + 2 data rows
    expect(rows).toHaveLength(3);
  });

  // @req REQ-101 FR87
  it("renders date, type, endonym-first people, place and source per row", () => {
    render(<EventChronologyTable language="fr" events={[resistanceEntry]} />);
    const row = screen.getByRole("row", { name: /Matumbi/ });
    expect(within(row).getByText("1905")).toBeInTheDocument();
    expect(within(row).getByText("résistance")).toBeInTheDocument();
    expect(within(row).getByText(/Matumbi/)).toBeInTheDocument();
    expect(within(row).getByText(/Ngoni/)).toBeInTheDocument();
    expect(within(row).getByText("Non documenté")).toBeInTheDocument();
    expect(
      within(row).getByRole("link", {
        name: "UNESCO General History of Africa",
      })
    ).toHaveAttribute("href", "https://example.org/unesco");
  });

  // @req REQ-101 FR87
  it("renders 'Non documenté' place and 'Aucune source citée' when neither is present", () => {
    render(<EventChronologyTable language="fr" events={[imposedNameEntry]} />);
    const row = screen.getByRole("row", { name: /Yoruba/ });
    expect(within(row).getByText("Non documenté")).toBeInTheDocument();
    expect(within(row).getByText("Aucune source citée")).toBeInTheDocument();
  });

  // @req REQ-091 FR90
  it("renders no rows when events is empty, without throwing", () => {
    expect(() =>
      render(<EventChronologyTable language="fr" events={[]} />)
    ).not.toThrow();
    const table = screen.getByRole("table", {
      name: "Chronologie des événements coloniaux",
    });
    expect(within(table).getAllByRole("row")).toHaveLength(1);
  });
});
