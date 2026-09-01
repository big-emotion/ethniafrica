import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SearchLensBar } from "../SearchLensBar";
import { EMPTY_SEARCH_LENS_COUNTS } from "@/lib/search/searchEnvelope";
import type { SearchLensCounts } from "@/lib/search/searchEnvelope";

const FULL_COUNTS: SearchLensCounts = {
  all: 16,
  people: 12,
  language: 5,
  languageFamily: 1,
  country: 3,
  patronyme: 2,
  person: 1,
};

describe("SearchLensBar", () => {
  // @req REQ-124
  it("renders one lens per entity type plus the all lens, when every count is positive", () => {
    render(
      <SearchLensBar
        active="all"
        counts={FULL_COUNTS}
        showCounts={false}
        onChange={vi.fn()}
      />
    );

    for (const name of [
      "Tout",
      "Peuples",
      "Langues",
      "Familles",
      "Pays",
      "Noms",
      "Personnes",
    ]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
  });

  // @req REQ-124
  it("hides counts until showCounts is true", () => {
    render(
      <SearchLensBar
        active="all"
        counts={{ ...EMPTY_SEARCH_LENS_COUNTS, people: 12 }}
        showCounts={false}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "Peuples" })).toBeInTheDocument();
    expect(screen.queryByText(/Peuples.*12/)).not.toBeInTheDocument();
  });

  // @req REQ-124
  it("shows each lens carrying its own count once showCounts is true", () => {
    render(
      <SearchLensBar
        active="all"
        counts={FULL_COUNTS}
        showCounts
        onChange={vi.fn()}
      />
    );

    expect(
      screen.getByRole("button", { name: "Peuples (12)" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Pays (3)" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Tout (16)" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Langues (5)" })
    ).toBeInTheDocument();
  });

  // @req REQ-124
  it("marks the active lens pressed and calls onChange when another lens is chosen", () => {
    const onChange = vi.fn();
    render(
      <SearchLensBar
        active="all"
        counts={FULL_COUNTS}
        showCounts={false}
        onChange={onChange}
      />
    );

    expect(screen.getByRole("button", { name: "Tout" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: "Peuples" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );

    screen.getByRole("button", { name: "Peuples" }).click();

    expect(onChange).toHaveBeenCalledWith("people");
  });

  // A lens with zero results would otherwise imply the corpus can answer a
  // query it cannot (e.g. "Personnes 0" on every search, since that table is
  // permanently empty) — ETNI-1807.
  // @req REQ-124
  it("does not render a lens whose count is zero", () => {
    render(
      <SearchLensBar
        active="all"
        counts={{ ...FULL_COUNTS, languageFamily: 0 }}
        showCounts={false}
        onChange={vi.fn()}
      />
    );

    expect(
      screen.queryByRole("button", { name: "Familles" })
    ).not.toBeInTheDocument();
    for (const name of [
      "Tout",
      "Peuples",
      "Langues",
      "Pays",
      "Noms",
      "Personnes",
    ]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
  });

  // @req REQ-124
  it("always renders the all lens regardless of its own count", () => {
    render(
      <SearchLensBar
        active="all"
        counts={EMPTY_SEARCH_LENS_COUNTS}
        showCounts={false}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "Tout" })).toBeInTheDocument();
  });

  // @req REQ-124
  it("renders lenses in the fixed order Tout, Peuples, Langues, Familles, Pays, Noms, Personnes", () => {
    render(
      <SearchLensBar
        active="all"
        counts={FULL_COUNTS}
        showCounts={false}
        onChange={vi.fn()}
      />
    );

    const names = screen
      .getAllByRole("button")
      .map((button) => button.textContent);

    expect(names).toEqual([
      "Tout",
      "Peuples",
      "Langues",
      "Familles",
      "Pays",
      "Noms",
      "Personnes",
    ]);
  });
});
