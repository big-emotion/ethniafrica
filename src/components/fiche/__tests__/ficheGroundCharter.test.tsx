import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { CountryRecordView } from "@/components/country/CountryRecordView";
import { PeopleDetailViewV2 } from "@/components/people/PeopleDetailViewV2";

import { countryRecord, peopleRecord } from "./corpusRecords";

/**
 * One ground, one gap, one width — as the DOM has to carry it.
 *
 * The stylesheet gives the ground, the radius and the gap to
 * `.afh-parchment-section`, and the flex gap to `.afh-parchment`. A child of
 * the parchment that is neither a chapter nor the amend band therefore falls
 * out of all three: that is how the people fiche's confidence line opened the
 * document on the page ground, and how the country's summary sat on no ground
 * at all while every chapter under it had one.
 */
function directChildren(container: HTMLElement): Element[] {
  const parchment = container.querySelector(".afh-parchment");
  if (!parchment) throw new Error("no parchment rendered");
  return Array.from(parchment.children);
}

function isChapterOrBand(element: Element): boolean {
  return (
    element.classList.contains("afh-parchment-section") ||
    element.classList.contains("afh-amend-band")
  );
}

describe("fiche ground charter", () => {
  afterEach(cleanup);

  // @req REQ-091
  it("gives every child of a people parchment the chapter ground", () => {
    const { container } = render(
      <PeopleDetailViewV2 language="fr" people={peopleRecord("PPL_OVAMBO")} />
    );
    const strays = directChildren(container)
      .filter((child) => !isChapterOrBand(child))
      .map((child) => child.outerHTML.slice(0, 80));
    expect(strays).toEqual([]);
  });

  // @req REQ-091
  it("gives every child of a country parchment the chapter ground", () => {
    const { container } = render(
      <CountryRecordView language="fr" country={countryRecord("NAM")} />
    );
    const strays = directChildren(container)
      .filter((child) => !isChapterOrBand(child))
      .map((child) => child.outerHTML.slice(0, 80));
    expect(strays).toEqual([]);
  });
});
