import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { EventTimelineMarkers } from "../EventTimelineMarkers";
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

const bounds = { min: 1850, max: 1907 };

// @req REQ-101 FR87
describe("EventTimelineMarkers (Epic 13, Story 13.12, ETNI-536)", () => {
  // @req REQ-101 FR87
  it("renders one focusable marker per event, in DOM order", () => {
    render(
      <EventTimelineMarkers
        events={[imposedNameEntry, resistanceEntry]}
        bounds={bounds}
      />
    );
    const markers = screen.getAllByRole("button", { name: /événement/ });
    expect(markers).toHaveLength(2);
    expect(markers[0]).toHaveAccessibleName(
      "événement nom imposé, 1850, Yoruba — Entrée pour ouvrir"
    );
    expect(markers[1]).toHaveAccessibleName(
      "événement résistance, 1905, Matumbi et Ngoni — Entrée pour ouvrir"
    );
  });

  // @req REQ-101 FR87
  it("opens the event card when a marker is activated via keyboard", async () => {
    const user = userEvent.setup();
    render(<EventTimelineMarkers events={[resistanceEntry]} bounds={bounds} />);
    const marker = screen.getByRole("button", { name: /résistance/ });
    marker.focus();
    await user.keyboard("{Enter}");
    expect(
      screen.getByRole("heading", { name: "Rébellion Maji Maji" })
    ).toBeInTheDocument();
  });

  // @req REQ-101 FR87
  it("closes the event card via the close control", async () => {
    const user = userEvent.setup();
    render(<EventTimelineMarkers events={[resistanceEntry]} bounds={bounds} />);
    await user.click(screen.getByRole("button", { name: /résistance/ }));
    expect(
      screen.getByRole("heading", { name: "Rébellion Maji Maji" })
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Fermer" }));
    expect(
      screen.queryByRole("heading", { name: "Rébellion Maji Maji" })
    ).toBeNull();
  });

  // @req REQ-101 FR87
  it("renders an accessible type-filter fieldset with a checkbox per colonial event type", () => {
    render(
      <EventTimelineMarkers
        events={[imposedNameEntry, resistanceEntry]}
        bounds={bounds}
      />
    );
    const group = screen.getByRole("group", {
      name: "Filtrer par type d'événement",
    });
    expect(
      within(group).getByRole("checkbox", { name: "fragmentation" })
    ).toBeInTheDocument();
    expect(
      within(group).getByRole("checkbox", { name: "déplacement forcé" })
    ).toBeInTheDocument();
    expect(
      within(group).getByRole("checkbox", { name: "nom imposé" })
    ).toBeInTheDocument();
    expect(
      within(group).getByRole("checkbox", { name: "résistance" })
    ).toBeInTheDocument();
  });

  // @req REQ-101 FR87
  it("unchecking a type filter removes that type's markers from the DOM", async () => {
    const user = userEvent.setup();
    render(
      <EventTimelineMarkers
        events={[imposedNameEntry, resistanceEntry]}
        bounds={bounds}
      />
    );
    await user.click(screen.getByRole("checkbox", { name: "résistance" }));
    expect(screen.queryByRole("button", { name: /résistance/ })).toBeNull();
    expect(
      screen.getByRole("button", { name: /nom imposé/ })
    ).toBeInTheDocument();
  });

  // @req REQ-101 FR87
  it("renders the unmodified TimeScrubber slider contract", () => {
    render(<EventTimelineMarkers events={[resistanceEntry]} bounds={bounds} />);
    const slider = screen.getByRole("slider");
    expect(slider).toHaveAttribute("aria-valuemin", "1850");
    expect(slider).toHaveAttribute("aria-valuemax", "1907");
  });

  // @req REQ-091 FR90
  it("never throws when events is empty", () => {
    expect(() =>
      render(<EventTimelineMarkers events={[]} bounds={bounds} />)
    ).not.toThrow();
  });

  // The marker strip carries its own name, which ARIA permits only on an
  // element with a role that supports naming — a bare div does not, and
  // axe-core failed the empty-timeline story on aria-prohibited-attr.
  // @req REQ-091 FR90
  it("exposes the marker strip as a named group, even with no events", () => {
    render(<EventTimelineMarkers events={[]} bounds={bounds} />);

    expect(
      screen.getByRole("group", { name: "Chronologie" })
    ).toBeInTheDocument();
  });
});
