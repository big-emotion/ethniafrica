import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HomeCorpusCounts } from "@/components/home/HomeCorpusCounts";

const FULL_CORPUS = {
  peoples: 4213,
  countries: 91,
  families: 37,
  languages: 748,
  nameForms: 3134,
  patronymes: 33,
  migrations: 5,
};

describe("HomeCorpusCounts — what the atlas documents, in three figures", () => {
  // @req REQ-113
  it("renders the three totals supplied by the server", () => {
    render(<HomeCorpusCounts counts={FULL_CORPUS} />);

    expect(screen.getByTestId("home-count-peoples")).toHaveTextContent(
      /4\s?213/
    );
    expect(screen.getByTestId("home-count-languages")).toHaveTextContent("748");
    expect(screen.getByTestId("home-count-patronymes")).toHaveTextContent("33");
  });

  // Peoples first, because that is the question most arrive with, then the
  // languages they speak and the names they carry. Not the corpus's own
  // famille → langue → peuple → pays nesting any more: the third tile left
  // that ladder when pays gave up its figure, and a nom sits on no rung of it.
  // @req REQ-113
  it("orders the figures the way the reader arrives at them", () => {
    render(<HomeCorpusCounts counts={FULL_CORPUS} />);

    const labels = screen
      .getAllByRole("term")
      .map((term) => term.textContent?.trim());

    expect(labels).toEqual([
      "peuples documentés",
      "langues documentées",
      "noms documentés",
    ]);
  });

  // Three totals out of the corpus's six classes may not read as the corpus
  // entire. Every label carries the scope word, so a reader counting 790 + 748
  // + 33 is told what those three figures are a count *of* — and the band's
  // accessible name says the same rather than « Le corpus en chiffres », which
  // is the claim a three-tile band is no longer allowed to make. The word does
  // the most work on the smallest figure: « noms documentés » says the atlas
  // has documented 33, never that Africa holds 33.
  // @req REQ-113
  it("scopes every figure to what the atlas documents", () => {
    render(<HomeCorpusCounts counts={FULL_CORPUS} />);

    expect(screen.getByTestId("home-corpus-counts")).toHaveAccessibleName(
      /ce que l'atlas documente/i
    );
    for (const term of screen.getAllByRole("term")) {
      expect(term.textContent).toMatch(/document/i);
    }
  });

  // A database failure is not an empty corpus. Printing zero would turn an
  // operational failure into a false claim on the site's most visible page.
  // @req REQ-113
  it("states that totals are unavailable instead of replacing them with zero", () => {
    render(<HomeCorpusCounts counts={null} />);

    expect(screen.getAllByText("Indisponible")).toHaveLength(3);
    expect(screen.queryByText("0")).not.toBeInTheDocument();
    for (const item of screen.getAllByTestId(/^home-count-/)) {
      expect(item).toHaveAttribute("data-state", "unavailable");
    }
  });

  // The reads behind these figures fail independently (see corpusCounts), so
  // the band has to be able to show two numbers and one absence rather than
  // going dark whole.
  // @req REQ-113
  it("marks a single missing figure unavailable and keeps the rest", () => {
    render(<HomeCorpusCounts counts={{ ...FULL_CORPUS, languages: null }} />);

    expect(screen.getByTestId("home-count-languages")).toHaveAttribute(
      "data-state",
      "unavailable"
    );
    expect(screen.getByTestId("home-count-peoples")).toHaveAttribute(
      "data-state",
      "available"
    );
    expect(screen.getAllByText("Indisponible")).toHaveLength(1);
  });

  // A tile is one block and gets one alignment (brand charter §8.1), and it
  // has to say so for both halves of the pair: mobile-text.css left-aligns
  // every `dt` and `dd` under 768px while the figure, a shrink-to-fit flex
  // item, centres itself — measured at 430px as « 790 » on the tile's centre
  // line above « peuples / documentés » starting 36px to its left. Asserted on
  // the declaration because happy-dom resolves no cascade across a component's
  // own <style>, so a render here cannot see the defect.
  // @req REQ-113
  it("declares one alignment for the figure and its label, at each width", () => {
    const { container } = render(<HomeCorpusCounts counts={FULL_CORPUS} />);
    const styles = Array.from(container.querySelectorAll("style"))
      .map((style) => style.textContent)
      .join("\n");

    const pair = /\.home-corpus-count dt,\s*\.home-corpus-count dd\s*\{[^}]*/g;
    const declarations = styles.match(pair) ?? [];

    expect(declarations).toHaveLength(2);
    expect(declarations[0]).toMatch(/text-align:\s*center/);
    expect(declarations[1]).toMatch(/text-align:\s*left/);
    expect(styles.indexOf("min-width: 1200px")).toBeLessThan(
      styles.lastIndexOf(".home-corpus-count dt")
    );
  });

  // Three totals are printed to be read across, so they have to sit on one
  // line. A tile is 116px of text at 430px, where « peuples documentés » and
  // « langues documentées » wrap and a 15-character label does not — and a
  // centred flex column then dropped the odd figure out of the row, measured
  // at 538 · 538 · 547. Two reserved label lines are what hold the row.
  //
  // The reservation may not be hidden behind a width, which is why this reads
  // the position of the declaration and not only its text: where a label stops
  // wrapping depends on the label, not the viewport, so a breakpoint tuned to
  // today's three strings stops holding the moment one is reworded — silently,
  // because a band that has drifted apart by nine pixels still renders.
  // Asserted on the declaration because happy-dom resolves no cascade across
  // the component's own <style>: a render here cannot see the defect.
  // @req REQ-113
  it("reserves a label height that keeps the three figures on one line", () => {
    const { container } = render(<HomeCorpusCounts counts={FULL_CORPUS} />);
    const styles = Array.from(container.querySelectorAll("style"))
      .map((style) => style.textContent)
      .join("\n");

    const reservation = styles.match(
      /\.home-corpus-count dt\s*\{[^}]*min-height:\s*2lh[^}]*\}/
    );

    expect(reservation).not.toBeNull();
    expect(styles.indexOf(reservation[0])).toBeLessThan(
      styles.indexOf("@media")
    );
  });

  // The band is three tiles, always the same three, always showing. Rotating
  // the classes through a fixed set of tiles was weighed and refused: a figure
  // that changes while the reader is still parsing the previous one is the
  // rotating-headline defect (#740) rebuilt one band lower, and it would arm
  // for nobody on `prefers-reduced-motion`.
  // @req REQ-113
  it("prints all three tiles at once, with no rotation", () => {
    const { container } = render(<HomeCorpusCounts counts={FULL_CORPUS} />);
    const styles = Array.from(container.querySelectorAll("style"))
      .map((style) => style.textContent)
      .join("\n");

    expect(screen.getAllByTestId(/^home-count-/)).toHaveLength(3);
    expect(styles).not.toMatch(/@keyframes|animation:/);
  });
});
