import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { BorderCrossingTable } from "../BorderCrossingTable";
import type { BorderCrossing } from "../BorderCrossingTable";

const ghaTogoCrossing: BorderCrossing = {
  countryA: { iso3: "GHA", nameFr: "Ghana" },
  countryB: { iso3: "TGO", nameFr: "Togo" },
  peoples: [{ peopleId: "PPL_EWE", autonym: "Eʋeawo", exonym: "Ewe" }],
  sources: [
    {
      id: "src-1",
      title: "Anglo-French Convention 1919",
      url: "https://example.org/1919",
    },
  ],
};

const noSourceCrossing: BorderCrossing = {
  countryA: { iso3: "BEN", nameFr: "Bénin" },
  countryB: { iso3: "NGA", nameFr: "Nigeria" },
  peoples: [{ peopleId: "PPL_YORUBA", autonym: "Yorùbá", exonym: "Yoruba" }],
  sources: [],
};

describe("BorderCrossingTable", () => {
  // @req REQ-091
  it("renders a semantic table with a caption and scoped column headers", () => {
    render(<BorderCrossingTable crossings={[ghaTogoCrossing]} />);

    const table = screen.getByRole("table");
    expect(table).toBeTruthy();
    expect(table.querySelector("caption")).toBeTruthy();

    const headers = within(table).getAllByRole("columnheader");
    expect(headers.length).toBeGreaterThan(0);
    headers.forEach((header) => {
      expect(header.getAttribute("scope")).toBe("col");
    });
  });

  // @req REQ-091
  it("renders one row per crossing with the country pair", () => {
    render(
      <BorderCrossingTable crossings={[ghaTogoCrossing, noSourceCrossing]} />
    );

    const table = screen.getByRole("table");
    const rows = within(table).getAllByRole("row");
    expect(rows.length).toBe(1 + 2);

    expect(screen.getByText(/Ghana/)).toBeTruthy();
    expect(screen.getByText(/Togo/)).toBeTruthy();
    expect(screen.getByText(/Bénin/)).toBeTruthy();
    expect(screen.getByText(/Nigeria/)).toBeTruthy();
  });

  // @req REQ-091
  it("lists the peoples crossed by each border, endonym first", () => {
    render(<BorderCrossingTable crossings={[ghaTogoCrossing]} />);

    expect(screen.getByText("Eʋeawo")).toBeTruthy();
  });

  // @req REQ-091
  it("renders each source as a link to its URL when present", () => {
    render(<BorderCrossingTable crossings={[ghaTogoCrossing]} />);

    const link = screen.getByRole("link", {
      name: "Anglo-French Convention 1919",
    });
    expect(link.getAttribute("href")).toBe("https://example.org/1919");
  });

  // @req REQ-091
  it("renders a placeholder instead of a broken link when a crossing has no documented source yet", () => {
    render(<BorderCrossingTable crossings={[noSourceCrossing]} />);

    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("—")).toBeTruthy();
  });

  // @req REQ-091
  it("renders nothing when there are no crossings", () => {
    const { container } = render(<BorderCrossingTable crossings={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
