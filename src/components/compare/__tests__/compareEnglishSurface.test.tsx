import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ComparisonView } from "@/components/compare/ComparisonView";
import { EntityComparePicker } from "@/components/compare/EntityComparePicker";
import type { ComparisonPageData } from "@/types/compare";

const DATA: ComparisonPageData = {
  type: "peuple",
  columns: [
    { id: "PPL_YORUBA", label: "Yoruba", type: "peuple" },
    { id: "PPL_IGBO", label: "Igbo", type: "peuple" },
  ],
  rows: [
    {
      key: "appellations",
      values: { PPL_YORUBA: { mainName: "Yoruba" }, PPL_IGBO: null },
    },
  ],
};

describe("the English comparison surface", () => {
  // @req REQ-145
  it("localizes the picker controls", () => {
    render(
      <EntityComparePicker
        language="en"
        fetchSuggestions={vi.fn().mockResolvedValue([])}
      />
    );

    const kinds = screen.getByRole("radiogroup", {
      name: "Entity type to compare",
    });
    expect(within(kinds).getByRole("radio", { name: "peoples" })).toBeVisible();
    expect(
      within(kinds).getByRole("radio", { name: "countries" })
    ).toBeVisible();
    expect(
      within(kinds).getByRole("radio", { name: "language families" })
    ).toBeVisible();
    expect(screen.getByPlaceholderText("Search peoples…")).toBeVisible();
    expect(screen.getByRole("button", { name: "compare" })).toBeDisabled();
  });

  // @req REQ-145
  it("localizes comparison headings, missing values and table semantics", () => {
    render(<ComparisonView language="en" data={DATA} />);

    expect(screen.getByText("Comparison of Yoruba and Igbo")).toBeVisible();
    expect(screen.getAllByRole("rowheader", { name: "Names" })).toHaveLength(1);
    expect(screen.getAllByText("not provided").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("region", { name: "Comparison table" })
    ).toBeVisible();
  });
});
