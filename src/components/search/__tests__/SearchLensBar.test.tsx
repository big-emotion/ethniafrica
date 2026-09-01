import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SearchLensBar } from "../SearchLensBar";
import { EMPTY_SEARCH_LENS_COUNTS } from "@/lib/search/searchEnvelope";

describe("SearchLensBar", () => {
  // @req REQ-124
  it("renders one lens per entity type plus the all lens", () => {
    render(
      <SearchLensBar
        active="all"
        counts={EMPTY_SEARCH_LENS_COUNTS}
        showCounts={false}
        onChange={vi.fn()}
      />
    );

    for (const name of [
      "Tout",
      "Familles",
      "Langues",
      "Peuples",
      "Pays",
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
        counts={{
          all: 16,
          people: 12,
          country: 3,
          languageFamily: 1,
          language: 0,
          person: 0,
        }}
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
      screen.getByRole("button", { name: "Langues (0)" })
    ).toBeInTheDocument();
  });

  // @req REQ-124
  it("marks the active lens pressed and calls onChange when another lens is chosen", () => {
    const onChange = vi.fn();
    render(
      <SearchLensBar
        active="all"
        counts={EMPTY_SEARCH_LENS_COUNTS}
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
});
