import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { PeopleNamesChapter } from "../PeopleNamesChapter";
import type { PatronymeLinkSummary } from "@/api/v2/services/patronymeFicheLinks";
import { getTranslation } from "@/lib/translations";

const borneNames: PatronymeLinkSummary[] = [
  { id: "NAME_Z", nameMain: "Zola", nameSystem: "clan_name" },
  { id: "NAME_A", nameMain: "Abikan", nameSystem: "clan_name" },
];

describe("PeopleNamesChapter", () => {
  afterEach(cleanup);

  // @req REQ-133
  it("offers an A–Z index and alphabetically ordered borne names", () => {
    const { container } = render(
      <PeopleNamesChapter language="fr" borneNames={borneNames} />
    );

    const index = screen.getByRole("navigation", {
      name: /index alphabétique/i,
    });
    expect(index).toHaveTextContent("A");
    expect(index).toHaveTextContent("Z");
    expect(screen.getByRole("link", { name: "A" })).toHaveAttribute(
      "href",
      "#noms-portes-a"
    );
    const text = container.textContent ?? "";
    expect(text.indexOf("Abikan")).toBeLessThan(text.indexOf("Zola"));
  });

  // A letter is a tap target in a strip of letters, not a word in a sentence:
  // at its text size it measured 12×24px on PPL_WOLOF, and Lighthouse's
  // target-size audit held the fiche's accessibility score at 0.97 for it.
  // happy-dom lays nothing out, so the floor is asserted as the class that
  // sets it — the same contract the country index already carries.
  // @req REQ-133
  it("gives every present letter of the index a 44px hit area", () => {
    render(<PeopleNamesChapter language="fr" borneNames={borneNames} />);

    for (const letter of ["A", "Z"]) {
      const link = screen.getByRole("link", { name: letter });
      expect(link).toHaveClass("min-h-11", "min-w-11");
    }
  });

  // @req REQ-119 REQ-133
  it("distinguishes a failed read from a documented empty corpus result", () => {
    const copy = getTranslation("en").patronymes.onFiche;
    const { rerender } = render(
      <PeopleNamesChapter language="en" borneNames={null} />
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      copy.peopleUnavailable
    );

    rerender(<PeopleNamesChapter language="en" borneNames={[]} />);
    expect(screen.getByRole("status")).toHaveTextContent(copy.peopleEmpty);
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });
});
