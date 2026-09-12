import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PeoplesSection } from "../PeoplesSection";
import { transformPeoples } from "@/lib/countryDataTransformer";

const parchmentCss = readFileSync(
  join(process.cwd(), "src/styles/fiche-parchment.css"),
  "utf8"
);

function namibia(shares: Array<[string, number, string?]>) {
  return transformPeoples(
    {
      totalPopulation: 3_100_000,
      referenceYear: 2025,
      peoples: shares.map(([name, percentageInCountry, peopleId]) => ({
        name,
        percentageInCountry,
        peopleId,
      })),
    } as never,
    undefined,
    "fr"
  );
}

/**
 * "Peuples du pays" as a French reader meets it: the figures in French, the
 * count as a count, and the part of the country the atlas has not assigned
 * to any people drawn rather than left as an empty stretch of track
 * (operator ruling, 2026-09-12).
 */
describe("PeoplesSection — the figures a reader is given", () => {
  // The section printed "3.1M" beside "habitants": an English figure under a
  // French word, on every country record.
  // @req REQ-154
  it("prints the population in French figures on a French record", () => {
    const { container } = render(
      <PeoplesSection
        language="fr"
        data={namibia([["Ovambo", 50, "PPL_OVAMBO"]])}
      />
    );

    expect(container.textContent).toMatch(/3,1\sM/);
    expect(container.textContent).not.toMatch(/\d\.\dM/);
  });

  // "1+ peuples" claimed more than the atlas holds and a plural it did not
  // have. The count is the peoples the atlas links to a record.
  // @req REQ-154
  it("counts the peoples the atlas links to a record, with no plus sign", () => {
    const { container } = render(
      <PeoplesSection
        language="fr"
        data={namibia([
          ["Ovambo", 50, "PPL_OVAMBO"],
          ["Groupe sans fiche", 10],
        ])}
      />
    );

    expect(screen.getByText("1 peuple")).toBeVisible();
    expect(container.textContent).not.toMatch(/\d\+/);
  });

  // @req REQ-154
  it("draws the share no people accounts for as a hatched segment", () => {
    const { container } = render(
      <PeoplesSection
        language="fr"
        data={namibia([
          ["Ovambo", 50, "PPL_OVAMBO"],
          ["Groupe sans fiche", 10],
        ])}
      />
    );

    const unassigned = container.querySelector<HTMLElement>(
      "[data-demo-bar] > [data-demo-unassigned]"
    );
    expect(unassigned?.style.width).toBe("40%");

    const rule = parchmentCss.match(/\[data-demo-unassigned\]\s*\{([^}]*)\}/);
    expect(rule?.[1]).toMatch(/repeating-linear-gradient\([^)]*var\(--afh-/);
    expect(rule?.[1]).not.toMatch(/#[0-9a-f]{3,6}\b/i);
  });

  // Three peoples at the same share fold into one row. That row stood for one
  // share in the bar and in the coverage sum, so three peoples at 10 % each
  // drew and counted as 10 %, and the country read 20 % emptier than it is.
  // @req REQ-154
  it("sizes a grouped row by every people it folds in", () => {
    const { container } = render(
      <PeoplesSection
        language="fr"
        data={namibia([
          ["Ovambo", 60, "PPL_OVAMBO"],
          ["Kavango", 10],
          ["Damara", 10],
          ["Nama", 10],
        ])}
      />
    );

    const grouped = container.querySelector<HTMLElement>(
      '[data-demo-bar] > [title^="Kavango"]'
    );
    expect(grouped?.style.width).toBe("30%");
    expect(
      container.querySelector<HTMLElement>("[data-demo-unassigned]")?.style
        .width
    ).toBe("10%");
    expect(container.querySelector("[data-demo-bar]")).toHaveAttribute(
      "data-declared-share",
      "90"
    );
  });

  // @req REQ-154
  it("draws no unassigned segment once the shares account for the country", () => {
    const { container } = render(
      <PeoplesSection
        language="fr"
        data={namibia([
          ["Ovambo", 60, "PPL_OVAMBO"],
          ["Herero", 40, "PPL_HERERO"],
        ])}
      />
    );

    expect(container.querySelector("[data-demo-unassigned]")).toBeNull();
  });
});
