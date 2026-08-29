import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CountryParchment } from "@/components/country/CountryParchment";
import { CountryFicheTitle } from "@/components/country/CountryFicheTitle";
import { CountryRecordView } from "@/components/country/CountryRecordView";
import { transformCountryData } from "@/lib/countryDataTransformer";
import type { CountryDetail } from "@/types/afrik-frontend";
import { getCountryRoute, getPeopleRoute } from "@/lib/routing";
import { deriveTrail } from "@/lib/navigation/deriveTrail";

/**
 * The country fiche's reading, against its mockup.
 *
 * The fiche merged before the shared parchment existed and kept the card
 * layout it shipped with in May. What the mockup asks for is one continuous
 * document: a head that names the country, then étymologie, peuples, royaumes
 * and sources — every one of them present, and the ones the corpus leaves
 * empty marked as empty rather than dropped (charter §4).
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

/**
 * The head and the trail stand above the globe now, so the assertions about
 * them address the band rather than the parchment. What each states is
 * unchanged — only which component owns it.
 */
function renderTitle(
  country: CountryDetail,
  provenance: { fromPeopleId?: string; fromPeopleName?: string } = {}
) {
  return render(<CountryFicheTitle country={country} {...provenance} />);
}

describe("country fiche charter", () => {
  // @req REQ-115
  it("opens on the country's own name, with the official name beneath it", () => {
    const { container } = renderTitle(countryFixture());

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

  // Charter §4: an empty field is information about the state of the corpus,
  // and dropping the chapter deletes that information. The fiche used to argue
  // the opposite — that a heading over nothing states the silence less
  // honestly than the absence does — which reads the silence as a defect
  // rather than as a fact worth publishing.
  // @req REQ-119
  it("keeps a chapter the corpus does not fill, and says so", () => {
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

    expect(headings).toContain("Royaumes et formations politiques");
    expect(headings).toContain("Étymologie du nom");
    expect(headings).toContain("Peuples du pays");
  });

  // @req REQ-119
  it("marks the unfilled chapter, and only that one", () => {
    renderParchment(
      countryFixture({
        kingdoms: [],
        etymology: undefined,
        nameOriginActor: undefined,
      })
    );

    const gaps = screen.getAllByText("Donnée manquante");
    expect(gaps).toHaveLength(2);

    // The chapter the corpus does fill carries no marker: a marker beside a
    // declared value would report a gap that is not there.
    const peoples = document.querySelector(
      '[data-fiche-section="Peuples du pays"]'
    );
    expect(peoples?.textContent).not.toContain("Donnée manquante");
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

/**
 * Two things the fiche shipped without, both visible on the mockup's parchment.
 *
 * The sources closing the fiche is not a matter of taste: the record view adds
 * three more chapters after the parchment, so "sources last" held inside
 * CountryParchment while the page put Noms, Faits and Culture after them. The
 * reader met the bibliography in the middle of the reading.
 */
describe("country fiche parchment — head and closing", () => {
  // The reference year dates the shares in "Peuples du pays". A fiche with no
  // demographics has nothing to date, so it says nothing.
  // @req REQ-115
  it("dates the fiche's figures in the eyebrow when it carries demographics", () => {
    const { container } = renderTitle(countryFixture());

    expect(container.querySelector(".afh-parchment-eyebrow")).toHaveTextContent(
      "NGA · fiche pays · réf. 2025"
    );
  });

  // @req REQ-115
  it("dates nothing when the corpus gives the country no demographics", () => {
    const { container } = renderTitle(
      countryFixture({ demographics: undefined, majorPeoples: undefined })
    );

    const eyebrow = container.querySelector(".afh-parchment-eyebrow");
    expect(eyebrow).toHaveTextContent("NGA · fiche pays");
    expect(eyebrow?.textContent).not.toMatch(/réf\./);
  });

  // @req REQ-115
  it("keeps the sources last when the page adds chapters of its own", () => {
    const country = countryFixture();
    const { container } = render(
      <CountryParchment data={transformCountryData(country)} country={country}>
        <section className="afh-parchment-section">
          <h2>Culture et société</h2>
        </section>
      </CountryParchment>
    );

    const headings = Array.from(
      container.querySelectorAll(".afh-parchment-section h2")
    ).map((node) => node.textContent);

    expect(headings.at(-1)).toBe("Sources");
    expect(headings).toContain("Culture et société");
  });
});

/**
 * Where a chapter's claim comes from, said to the reader.
 *
 * The notes started life as the JSON path a developer would grep for —
 * "content.etymology · nameOriginActor" over the étymologie chapter. The
 * charter's intent is right and the audience was wrong: a reader checking a
 * claim looks for the fiche's rubric, not for a key in a file they will never
 * open.
 */
describe("country fiche — provenance notes address the reader", () => {
  // A dotted lowerCamelCase path: "content.culture", "generalInfo.branches".
  // French prose never produces one, so its presence is the tell.
  const FIELD_PATH = /[a-z][A-Za-z0-9]*\.[a-zA-Z]/;

  // @req REQ-119
  it("prints no field path in the parchment's notes", () => {
    const { container } = renderParchment(countryFixture());

    const notes = Array.from(
      container.querySelectorAll(".afh-parchment-note")
    ).map((node) => node.textContent ?? "");

    expect(notes.length).toBeGreaterThan(0);
    for (const note of notes) expect(note).not.toMatch(FIELD_PATH);
  });

  // @req REQ-119
  it("names the rubric each chapter reads", () => {
    const { container } = renderParchment(countryFixture());

    const noteFor = (title: string) =>
      container.querySelector(
        `[data-fiche-section="${title}"] .afh-parchment-note`
      )?.textContent ?? "";

    expect(noteFor("Étymologie du nom")).toMatch(/étymologie/i);
    expect(noteFor("Peuples du pays")).toMatch(/démographie/i);
    expect(noteFor("Royaumes et formations politiques")).toMatch(/royaumes/i);
    expect(noteFor("Sources")).toMatch(/sources/i);
  });
});

/**
 * The four chapters the record view adds after the parchment's own.
 *
 * They were hand-rolled `<section class="afh-parchment-section">` blocks with
 * their own `<h2>` and note, so they carried no `data-fiche-section` and no
 * charter contract could see them — which is how one of them kept a note
 * naming a path for years.
 */
describe("country record view — the chapters the page adds", () => {
  const FIELD_PATH = /[a-z][A-Za-z0-9]*\.[a-zA-Z]/;

  function renderRecord(country: CountryDetail) {
    return render(<CountryRecordView country={country} />);
  }

  // @req REQ-119
  it("prints no field path in the added chapters' notes", () => {
    const { container } = renderRecord(
      countryFixture({
        historicalNames: { contemporary: "Nigéria depuis 1960." },
        historicalFacts: { colonization: "Protectorat britannique." },
        culture: {
          mainLanguages: [{ name: "haoussa" }],
          dominantReligions: "Islam, christianisme.",
        },
      } as Partial<CountryDetail>)
    );

    const notes = Array.from(
      container.querySelectorAll(".afh-parchment-note")
    ).map((node) => node.textContent ?? "");

    expect(notes.length).toBeGreaterThan(4);
    for (const note of notes) expect(note).not.toMatch(FIELD_PATH);
  });

  // @req REQ-119
  it("keeps the added chapters when the corpus leaves them empty", () => {
    const { container } = renderRecord(countryFixture());

    const titles = Array.from(
      container.querySelectorAll("[data-fiche-section]")
    ).map((node) => node.getAttribute("data-fiche-section"));

    expect(titles).toContain("Noms à travers l'histoire");
    expect(titles).toContain("Faits historiques majeurs");
    expect(titles).toContain("Langues");
    expect(titles).toContain("Culture et société");
  });

  /**
   * Arriving from a people fiche used to rewrite the trail into "Peuples ›
   * Yoruba › Nigéria", which reads as a hierarchy the corpus does not have —
   * and gave the same page two different trails depending on the door. The
   * arrival is real and still offered, as a way back.
   */
  // @req REQ-115
  it("says where the reader came from without claiming a country sits under a people", () => {
    renderTitle(countryFixture(), {
      fromPeopleId: "PPL_YORUBA",
      fromPeopleName: "Yoruba",
    });

    // The trail is the shell's now, so the claim is checked where it is made:
    // the derivation puts the country under Pays and never under the people
    // the reader happened to arrive from.
    const trail = deriveTrail(
      getCountryRoute("fr", countryFixture().id),
      countryFixture().nameFr
    );
    expect(trail.map((crumb) => crumb.label)).toContain("Pays");
    expect(JSON.stringify(trail)).not.toContain("Yoruba");
    expect(
      screen.queryByRole("navigation", { name: "Fil d'ariane" })
    ).toBeNull();

    const back = screen.getByTestId("country-back-to-people");
    expect(back).toHaveAttribute("href", getPeopleRoute("fr", "PPL_YORUBA"));
    expect(back).toHaveTextContent("Yoruba");
  });

  // @req REQ-115
  it("offers no way back when the reader arrived from the hub", () => {
    render(<CountryRecordView country={countryFixture()} />);

    expect(screen.queryByTestId("country-back-to-people")).toBeNull();
  });
});
