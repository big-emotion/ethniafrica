/**
 * Tests for NameSpellingHistory (ETNI-472 / Epic 8 Story 8.8).
 *
 * The component MUST:
 *   - render a semantic <ol> in the given chronological order,
 *   - render one ConfidenceChip (slot) per entry,
 *   - never invent — render nothing when there are no spellings.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NameSpellingHistory } from "@/components/names/NameSpellingHistory";
import type { NameSpellingHistoryEntry } from "@/types/names";

const spellings: NameSpellingHistoryEntry[] = [
  {
    nameText: "Congo",
    periodLabel: "1885-1908",
    confidenceChip: <span data-testid="chip-1">chip-1</span>,
  },
  {
    nameText: "Kongo",
    periodLabel: "1960-présent",
    confidenceChip: <span data-testid="chip-2">chip-2</span>,
  },
];

describe("NameSpellingHistory", () => {
  // @req REQ-056
  it("renders a semantic <ol>", () => {
    const { container } = render(<NameSpellingHistory spellings={spellings} />);
    expect(container.querySelector("ol")).not.toBeNull();
  });

  // @req REQ-056
  it("renders entries in the given chronological order", () => {
    render(<NameSpellingHistory spellings={spellings} />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Congo");
    expect(items[1]).toHaveTextContent("Kongo");
  });

  // @req REQ-057
  it("renders one ConfidenceChip slot per entry", () => {
    render(<NameSpellingHistory spellings={spellings} />);
    expect(screen.getByTestId("chip-1")).toBeInTheDocument();
    expect(screen.getByTestId("chip-2")).toBeInTheDocument();
  });

  // @req REQ-056
  it("renders the period label for each entry when present", () => {
    render(<NameSpellingHistory spellings={spellings} />);
    expect(screen.getByText(/1885-1908/)).toBeInTheDocument();
    expect(screen.getByText(/1960-présent/)).toBeInTheDocument();
  });

  // @req REQ-056
  it("renders nothing when spellings is empty", () => {
    const { container } = render(<NameSpellingHistory spellings={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
