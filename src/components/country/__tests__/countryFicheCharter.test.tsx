import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CountryParchment } from "@/components/country/CountryParchment";
import { transformCountryData } from "@/lib/countryDataTransformer";
import type { CountryDetail } from "@/types/afrik-frontend";

/**
 * The country fiche's reading, against its mockup.
 *
 * The fiche merged before the shared parchment existed and kept the card
 * layout it shipped with in May. What the mockup asks for is one continuous
 * document: a head that names the country, then étymologie, peuples, royaumes
 * and sources, each section absent when the corpus does not fill it.
 *
 * The regimes below are the ones the corpus really has — kingdoms or none, a
 * declared share that reaches 100 % or falls short, a name whose author is
 * recorded or is not.
 */

function countryFixture(overrides: Partial<CountryDetail> = {}): CountryDetail {
  return {
    id: "NGA",
    nameFr: "République fédérale du Nigéria",
    nameCommonFr: "Nigéria",
    nameOfficial: "République fédérale du Nigéria",
    etymology: "Du fleuve Niger, dont le nom est lui-même d'origine contestée.",
    nameOriginActor: "Flora Shaw",
    demographics: {
      peoples: [
        { name: "Haoussa", population: 67_000_000, percentageInCountry: 30 },
        { name: "Yoruba", population: 44_000_000, percentageInCountry: 20 },
      ],
    },
    kingdoms: [
      {
        name: "Empire du Kanem-Bornou",
        period: "700–1900",
        historicalRole: "Contrôle des routes transsahariennes.",
        politicalCenters: ["Njimi", "Ngazargamu"],
      },
    ],
    sources: [
      {
        title: "UN World Population Prospects",
        url: "https://population.un.org/wpp/",
        tier: "official",
      },
    ],
    ...overrides,
  } as CountryDetail;
}

function renderParchment(country: CountryDetail) {
  return render(
    <CountryParchment data={transformCountryData(country)} country={country} />
  );
}

describe("country fiche charter", () => {
  // @req REQ-115
  it("opens on the country's own name, with the official name beneath it", () => {
    const { container } = renderParchment(countryFixture());

    const head = container.querySelector(".afh-parchment-head");
    expect(head).not.toBeNull();
    expect(
      within(head as HTMLElement).getByRole("heading", { level: 1 })
    ).toHaveTextContent("Nigéria");
    expect(head).toHaveTextContent("République fédérale du Nigéria");
  });

  // The mockup writes "un nom de 1914" in italics beside the title. No corpus
  // field carries it, so the fiche would be asserting a date it cannot source.
  // @req REQ-115
  it("asserts no date the corpus does not state", () => {
    const { container } = renderParchment(countryFixture());

    expect(container.querySelector(".afh-parchment-head em")).toBeNull();
    expect(container.textContent).not.toMatch(/1914/);
  });

  // @req REQ-115
  it("lays the four sections out in the mockup's order", () => {
    const { container } = renderParchment(countryFixture());

    const headings = Array.from(
      container.querySelectorAll(".afh-parchment-section h2")
    ).map((node) => node.textContent);

    expect(headings).toEqual([
      "Étymologie du nom",
      "Peuples du pays",
      "Royaumes et formations politiques",
      "Sources",
    ]);
  });

  // @req REQ-115
  it("prints the etymology as prose and names who imposed the name", () => {
    renderParchment(countryFixture());

    expect(screen.getByText(/Du fleuve Niger/)).toBeInTheDocument();
    expect(screen.getByText(/Flora Shaw/)).toBeInTheDocument();
  });

  // A heading over nothing states that the corpus is silent less honestly
  // than the section's own absence does.
  // @req REQ-115
  it("drops a section the corpus does not fill", () => {
    const { container } = renderParchment(
      countryFixture({
        kingdoms: [],
        etymology: undefined,
        nameOriginActor: undefined,
      })
    );

    const headings = Array.from(
      container.querySelectorAll(".afh-parchment-section h2")
    ).map((node) => node.textContent);

    expect(headings).not.toContain("Royaumes et formations politiques");
    expect(headings).not.toContain("Étymologie du nom");
    expect(headings).toContain("Peuples du pays");
  });

  // @req REQ-092
  it("explains why the declared shares fall short of the whole", () => {
    const { container } = renderParchment(countryFixture());

    const shortfall = Array.from(
      container.querySelectorAll(".afh-parchment-callout")
    ).find((node) => /100/.test(node.textContent ?? ""));

    expect(shortfall).toBeDefined();
    expect(shortfall).toHaveTextContent(/99/);
    // "totalitédes" shipped once: the JSX transform drops the space opening a
    // text node that follows an element.
    expect(shortfall?.textContent).toContain("totalité des fiches");
    // The mockup blames a top-eight cut-off. This fiche lists every people it
    // has, so that sentence would be false here.
    expect(shortfall).not.toHaveTextContent(/huit premiers/i);
  });

  // @req REQ-092
  it("gives each source its own standing, and never the retired Tier scale", () => {
    const { container } = renderParchment(countryFixture());

    expect(screen.getByText("Officielle")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/Tier\s*1/);
  });

  // ConfidenceChip's incomplete-confidence fallback links to #sources by hard
  // coded id, so the anchor has to exist on this surface.
  // @req REQ-116
  it("anchors the sources section where the confidence chip points", () => {
    const { container } = renderParchment(countryFixture());

    expect(container.querySelector("#sources")).not.toBeNull();
  });

  // The dossier is the page; a citation pointing at the record chapter would
  // point at the reader's own position.
  // @req REQ-116
  it("emits no link to the record chapter", () => {
    const { container } = renderParchment(countryFixture());

    expect(container.querySelector('a[href="#fiche-record"]')).toBeNull();
  });
});
