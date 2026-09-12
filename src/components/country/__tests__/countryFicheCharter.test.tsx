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
 * The page merged before the shared parchment existed and kept the card
 * layout it shipped with in May. What the mockup asks for is one continuous
 * document: a head that names the country, then étymologie, peuples, royaumes
 * and sources — every one of them present, and the ones the atlas leaves
 * empty marked as empty rather than dropped (charter §4).
 *
 * The regimes below are the ones the atlas really has — kingdoms or none, a
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
    <CountryParchment
      language="fr"
      data={transformCountryData(country)}
      country={country}
    />
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
  return render(
    <CountryFicheTitle language="fr" country={country} {...provenance} />
  );
}

describe("country fiche charter", () => {
  /**
   * A reader decides a record is thin in the first screen. That was also the
   * screen with no way to say so: the word "contribuer" existed in the
   * navigation, the footer, the site tree and on the contribute page itself,
   * and nowhere on the record it was about. The actions charter asks a click
   * to take a shape, so this is a link to a real address, not a mood.
   */
  // @req REQ-091
  it("offers a way to amend the record from the record's own head", () => {
    renderTitle(countryFixture());

    const contribute = screen.getByTestId("country-contribute");
    expect(contribute).toHaveTextContent("Contribuer");
    expect(contribute).toHaveAttribute("href", "/fr/contribute");
  });

  // @req REQ-145
  it("renders country fiche chrome in English while preserving corpus values", () => {
    const country = countryFixture();
    const { rerender } = render(
      <CountryFicheTitle language="en" country={country} />
    );
    expect(screen.getByText(/country page/)).toBeVisible();
    expect(screen.getByRole("heading", { name: "Nigéria" })).toBeVisible();

    rerender(<CountryRecordView language="en" country={country} />);
    // The name's history now opens the History chapter as its first tile.
    expect(screen.getByText("Where the name comes from")).toBeVisible();
    expect(screen.getByRole("heading", { name: "History" })).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Culture and society" })
    ).toBeVisible();
    expect(screen.getByText(/Du fleuve Niger/)).toBeVisible();
  });

  // A missing people breakdown does not erase the independently sourced
  // national population. Madagascar is the atlas case for this distinction.
  // @req REQ-115
  it("keeps the national total visible when no people rows are available", () => {
    const { container } = renderParchment(
      countryFixture({
        id: "MDG",
        demographics: {
          totalPopulation: 32700000,
          referenceYear: 2025,
          source: "UNFPA – World Population Dashboard",
          peoples: [],
        },
      })
    );
    const section = container.querySelector(
      '[data-fiche-section="Peuples du pays"]'
    );

    expect(section).toHaveTextContent("32.7M");
    expect(section).toHaveTextContent("Donnée manquante");
  });

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

  // Every fiche printed its name twice for as long as `name_official` had no
  // column to land in: the mapper fell back to `nameFr`, and the h1 resolves
  // to the same French common name. The pipeline is fixed, but the head also
  // refuses the repetition on its own — the family lede already declines to
  // name the autonym and the English name when they are one word, and this is
  // the same fact presented as two.
  // @req REQ-115
  it("states the official name once, never twice", () => {
    const { container } = renderTitle(
      countryFixture({
        id: "ZAF",
        nameFr: "Afrique du Sud",
        nameCommonFr: "Afrique du Sud",
        nameOfficial: "Afrique du Sud",
      })
    );

    const head = container.querySelector(".afh-parchment-head");
    expect(
      within(head as HTMLElement).getByRole("heading", { level: 1 })
    ).toHaveTextContent("Afrique du Sud");
    expect(head!.querySelector(".afh-parchment-lede")).toBeNull();
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
  // @req REQ-154
  it("publishes the eight chapters in reading order", () => {
    const { container } = render(
      <CountryRecordView
        language="fr"
        country={countryFixture()}
        onward={
          <section data-fiche-section="Poursuivre" id="chapitre-poursuivre" />
        }
      />
    );
    expect(
      Array.from(container.querySelectorAll("[data-fiche-section]"), (node) =>
        node.getAttribute("data-fiche-section")
      )
    ).toEqual([
      "En bref",
      "Peuples du pays",
      "Langues",
      "Histoire",
      "Noms de personnes rattachés à ce pays",
      "Culture et société",
      "Poursuivre",
      "Sources",
    ]);
  });

  /**
   * A page resting on seven unexamined sources out of nine is a fact about
   * the page, and reading nine entries was the only way to learn it. The
   * line counts each standing separately — a census, never the single
   * verdict `SourcesFooter` refuses, which would make the strongest source
   * and the weakest read alike.
   */
  // @req REQ-092
  it("says what the source apparatus amounts to, by standing", () => {
    const { container } = renderParchment(countryFixture());

    const tally = container.querySelector('[data-testid="sources-tally"]');
    expect(tally?.textContent).toMatch(/^\d+ sources? · /);
    expect(tally?.textContent).toMatch(/ : \d+/);
  });

  // @req REQ-154
  it("keeps dated and undated political entries on one history spine without assigning a date", () => {
    const { container } = renderParchment(
      countryFixture({
        kingdoms: [
          {
            name: "Royaume daté",
            period: "1600–1700",
            historicalRole: "Centre régional.",
          },
          {
            name: "Royaume non daté",
            period: "Précolonial",
            historicalRole: "Centre local.",
          },
        ],
        historicalFacts: { colonization: "Administration coloniale attestée." },
      })
    );
    const chapter = container.querySelector('[data-fiche-section="Histoire"]');
    expect(chapter?.querySelectorAll("ol.afh-chronology")).toHaveLength(1);
    expect(chapter).toHaveTextContent("Royaume daté");
    expect(chapter).toHaveTextContent("Administration coloniale attestée.");
    const undated = Array.from(
      chapter?.querySelectorAll("ol.afh-chronology > li") ?? []
    ).find((item) => item.textContent?.includes("Royaume non daté"));
    expect(undated).toHaveTextContent("Précolonial");
    expect(undated?.textContent).not.toMatch(/\d{4}/);
  });

  /**
   * A precolonial kingdom, a colonial administration and a modern state are
   * three kinds of authority, and the corpus types each one. The record used
   * to cut the chronology to the first kind, on the stated promise that the
   * other two appeared "further down the page" — in a timeline that was
   * written and never wired. So the promise went unkept and a reader was
   * shown the kingdoms of a country and none of what replaced them.
   */
  // @req REQ-154
  it("shows all three kinds of authority, each period inked by its own", () => {
    const { container } = renderParchment(
      countryFixture({
        kingdoms: [
          {
            name: "Royaume du Burundi",
            period: "XVIe siècle - 1966",
            entryType: "polity",
            historicalRole: "Monarchie du mwami.",
          },
          {
            name: "Ruanda-Urundi",
            period: "1916 - 1962",
            entryType: "colonial",
            historicalRole: "Mandat belge, puis tutelle.",
          },
          {
            name: "République du Burundi",
            period: "1966 - présent",
            entryType: "modern",
            historicalRole: "Abolition de la monarchie.",
          },
        ],
      })
    );

    const chapter = container.querySelector('[data-fiche-section="Histoire"]');
    expect(chapter).toHaveTextContent("Ruanda-Urundi");
    expect(chapter).toHaveTextContent("République du Burundi");

    const regimes = Array.from(
      chapter?.querySelectorAll("ol.afh-chronology > li") ?? [],
      (station) => station.getAttribute("data-regime")
    );
    expect(regimes).toEqual(["polity", "colonial", "modern"]);
  });

  // A seat of power is a fact about an entity, and the corpus states it. It
  // used to be printed in the paragraph dress of the account above it, which
  // read as one more sentence rather than as a place.
  // @req REQ-154
  it("names the seats of power under the account that mentions them", () => {
    const { container } = renderParchment(
      countryFixture({
        kingdoms: [
          {
            name: "Royaume du Burundi",
            period: "XVIe siècle - 1966",
            entryType: "polity",
            historicalRole: "Monarchie du mwami.",
            politicalCenters: ["Gitega", "Muramvya"],
          },
        ],
      })
    );

    const seats = container.querySelector(
      '[data-fiche-section="Histoire"] .afh-chronology-centres'
    );
    expect(seats).toHaveTextContent("Gitega · Muramvya");
    // A paragraph, because that is what keeps it left of a phone's centre.
    expect(seats?.tagName).toBe("P");
  });

  // @req REQ-154
  it("keeps an entity's first sentence visible while disclosing its longer account", () => {
    const { container } = renderParchment(
      countryFixture({
        kingdoms: [
          {
            name: "Protectorat",
            period: "1900 - 1960",
            entryType: "colonial",
            historicalRole:
              "A protectorate was established. Its institutions changed later.",
          },
        ],
      })
    );
    const chapter = container.querySelector('[data-fiche-section="Histoire"]');
    const tile = chapter?.querySelector(
      "ol.afh-chronology details[data-fiche-tile]"
    );
    expect(tile?.querySelector("summary")).toHaveTextContent(
      "A protectorate was established."
    );
    expect(tile).toHaveTextContent("Its institutions changed later.");
    expect(tile).toHaveAttribute("data-body-restates-preview", "true");
  });

  // @req REQ-154
  it("prints former names once and leaves the present name as the final station", () => {
    const { container } = renderParchment(
      countryFixture({
        historicalNames: {
          colonization: "1900: Ancien nom",
          contemporary: "1960: Nom actuel",
          formerNames: ["Ancien nom", "Autre nom (1850–1900)"],
        },
      })
    );
    const chapter = container.querySelector('[data-fiche-section="Histoire"]')!;
    expect(chapter.textContent!.split("Autre nom (1850–1900)")).toHaveLength(2);
    const stations = Array.from(
      chapter.querySelectorAll("ol.afh-chronology > li"),
      (node) => node.textContent ?? ""
    );
    expect(stations.at(-1)).toContain("Nigéria");
    expect(stations.at(-1)).toContain("Nom actuel");
  });

  // @req REQ-154
  it("does not render an empty disclosure for a polity without further detail", () => {
    const { container } = renderParchment(
      countryFixture({
        kingdoms: [{ name: "Royaume connu", period: "Précolonial" }],
      })
    );
    const chapter = container.querySelector('[data-fiche-section="Histoire"]');
    expect(chapter).toHaveTextContent("Royaume connu");
    expect(chapter?.querySelector("ol.afh-chronology details")).toBeNull();
  });

  // @req REQ-154
  it("labels languages derived from resident peoples and keeps the chapter visible", () => {
    const { container } = render(
      <CountryRecordView
        language="fr"
        country={countryFixture({ culture: undefined })}
        countryLanguages={{
          value: [{ name: "Yoruba", isoCode: "yor" }],
          provenance: "derived",
          from: ["PPL_YORUBA"],
        }}
      />
    );
    const chapter = container.querySelector('[data-fiche-section="Langues"]');
    expect(chapter).toHaveTextContent("Yoruba");
    expect(chapter?.querySelector(".afh-parchment-note")).toHaveTextContent(
      "Déduit des pages peuple documentées dans l’atlas."
    );
  });

  // @req REQ-115
  it("prints the etymology as prose and names who imposed the name", () => {
    renderParchment(countryFixture());

    expect(screen.getByText(/Du fleuve Niger/)).toBeInTheDocument();
    expect(screen.getByText(/Flora Shaw/)).toBeInTheDocument();
  });

  // Charter §4: an empty field is information about the state of the atlas,
  // and dropping the chapter deletes that information. The page used to argue
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

    expect(headings).toContain("Histoire");
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

    expect(
      document.querySelector('[data-fiche-section="Histoire"]')
    ).toHaveTextContent("Donnée manquante");

    // The chapter the atlas does fill carries no marker: a marker beside a
    // declared value would report a gap that is not there.
    const peoples = document.querySelector(
      '[data-fiche-section="Peuples du pays"]'
    );
    expect(peoples?.textContent).not.toContain("Donnée manquante");
  });

  /**
   * The shortfall is admitted once, and in figures the reader can check
   * against the bar above it. It used to be admitted twice — the coverage note
   * asserted here, then a callout restating it behind the number of the
   * validation rule that defines the tolerated band.
   */
  // @req REQ-092
  it("admits how much of the country its peoples account for, once", () => {
    const { container } = renderParchment(countryFixture());

    const coverage = container.querySelector("[data-demo-coverage-note]");

    expect(coverage).toBeDefined();
    expect(coverage?.textContent).toMatch(/50\s%/);
    expect(coverage?.textContent).toContain("pas encore réparti");
    // The mockup blames a top-eight cut-off. This page lists every people it
    // has, so that sentence would be false here.
    expect(container.textContent).not.toMatch(/huit premiers/i);
    // The name's author used to sit in a callout of its own; it now reads
    // inside the etymology tile, so nothing on the parchment is set apart as
    // a callout at all.
    expect(container.querySelectorAll(".afh-parchment-callout")).toHaveLength(
      0
    );
  });

  // The country's summary is prose, and prose on a record folds behind its
  // first sentence like every other field (operator ruling, 2026-09-12).
  // @req REQ-151
  it("folds the country portrait behind its first sentence in En bref", () => {
    const { container } = renderParchment(
      countryFixture({
        summary:
          "Le Nigéria porte le nom du fleuve Niger. Il compte de nombreux peuples.",
      })
    );
    const brief = container.querySelector('[data-fiche-section="En bref"]')!;
    const tile = Array.from(brief.querySelectorAll("[data-fiche-tile]")).find(
      (node) =>
        node.querySelector(".afh-tile-label")?.textContent === "Portrait"
    );
    expect(tile?.tagName).toBe("DETAILS");
    expect(tile?.querySelector("[data-closed-fact]")).toHaveTextContent(
      "Le Nigéria porte le nom du fleuve Niger."
    );
    expect(tile).toHaveTextContent("Il compte de nombreux peuples.");
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
 * Two things the page shipped without, both visible on the mockup's parchment.
 *
 * The sources closing the page is not a matter of taste: the record view adds
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
      "NGA · page du pays · réf. 2025"
    );
  });

  // @req REQ-115
  it("dates nothing when the atlas gives the country no demographics", () => {
    const { container } = renderTitle(
      countryFixture({ demographics: undefined, majorPeoples: undefined })
    );

    const eyebrow = container.querySelector(".afh-parchment-eyebrow");
    expect(eyebrow).toHaveTextContent("NGA · page du pays");
    expect(eyebrow?.textContent).not.toMatch(/réf\./);
  });

  // @req REQ-115
  it("keeps the sources last when the page adds chapters of its own", () => {
    const country = countryFixture();
    const { container } = render(
      <CountryParchment
        language="fr"
        data={transformCountryData(country)}
        country={country}
      >
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
 * A chapter's note earns its line, or there is no line.
 *
 * The notes started life as the JSON path a developer would grep for —
 * "content.etymology · nameOriginActor" over the étymologie chapter. They were
 * then translated into the fiche model's French rubric names, which read like
 * prose but named the same machinery: under a heading already reading
 * "Royaumes et formations politiques" stood "Rubrique « royaumes » de la
 * fiche". Both spellings annotate the fiche for whoever builds it.
 *
 * A note survives only where it states something the title does not — the
 * reference year of a figure, a derivation, what the tier badge means.
 */
describe("country fiche — a note only where it adds something", () => {
  // A dotted lowerCamelCase path: "content.culture", "generalInfo.branches".
  // French prose never produces one, so its presence is the tell.
  const FIELD_PATH = /[a-z][A-Za-z0-9]*\.[a-zA-Z]/;
  // The model's own section names, quoted at the reader.
  const MODEL_RUBRIC = /rubriques?\s+«/i;

  // @req REQ-119
  it("names neither a field path nor a rubric of the page model", () => {
    const { container } = renderParchment(countryFixture());

    const notes = Array.from(
      container.querySelectorAll(".afh-parchment-note")
    ).map((node) => node.textContent ?? "");

    expect(notes.length).toBeGreaterThan(0);
    for (const note of notes) {
      expect(note).not.toMatch(FIELD_PATH);
      expect(note).not.toMatch(MODEL_RUBRIC);
    }
  });

  // @req REQ-119
  it("leaves a chapter bare when its title already says where it reads", () => {
    const { container } = renderParchment(countryFixture());

    const noteFor = (title: string) =>
      container.querySelector(
        `[data-fiche-section="${title}"] .afh-parchment-note`
      );

    expect(noteFor("Peuples du pays")).toBeNull();
    expect(noteFor("Histoire")).toBeNull();

    // Sources keeps one: the tier badge on each row is not self-explanatory.
    expect(noteFor("Sources")?.textContent).toMatch(/palier/i);
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
  function renderRecord(country: CountryDetail) {
    return render(<CountryRecordView language="fr" country={country} />);
  }

  /**
   * Each of the four repeated its own heading back as a rubric — "Rubrique
   * « faits historiques » de la page" under "Faits historiques majeurs". None
   * of them states a reference year or a derivation, so none of them has a
   * note left to print.
   */
  // @req REQ-119
  it("prints no note at all, having nothing its titles do not say", () => {
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

    // Scoped to the four: the view wraps CountryParchment, whose Sources
    // chapter keeps the one note that still earns its line.
    for (const title of ["Histoire", "Langues", "Culture et société"]) {
      expect(
        container.querySelector(
          `[data-fiche-section="${title}"] .afh-parchment-note`
        )
      ).toBeNull();
    }
  });

  // @req REQ-119
  it("keeps the added chapters when the corpus leaves them empty", () => {
    const { container } = renderRecord(countryFixture());

    const titles = Array.from(
      container.querySelectorAll("[data-fiche-section]")
    ).map((node) => node.getAttribute("data-fiche-section"));

    expect(titles).toContain("Histoire");
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
    render(<CountryRecordView language="fr" country={countryFixture()} />);

    expect(screen.queryByTestId("country-back-to-people")).toBeNull();
  });
});

/**
 * Internal vocabulary is not editorial content.
 *
 * The fiche printed the identifier of the validation rule behind a demographic
 * shortfall ("la règle FR28 porte sur…") and a label announcing the fiche's own
 * editorial posture ("Ce que la page refuse de taire"). Neither addresses the
 * reader: a visitor cannot act on a requirement number, and the callout's
 * accent rule is what already sets the passage apart. What the reader is owed
 * is the claim itself — who named the country, and how much of its population
 * the fiche accounts for.
 */
describe("what the parchment never says out loud", () => {
  // @req REQ-115
  it("names no internal requirement behind a shortfall it admits", () => {
    const { container } = renderParchment(countryFixture());

    expect(container.textContent).toContain("50 % de la population");
    expect(container.textContent).not.toMatch(
      /\b(?:FR|NFR)\d{1,3}\b|REQ-\d+|DEC-\d+|ARCH-\d+|ETNI-\d+/
    );
  });

  // @req REQ-115
  it("states who named the country without announcing its own posture", () => {
    const { container } = renderParchment(countryFixture());

    expect(container.textContent).toContain("Flora Shaw");
    expect(container.textContent).not.toMatch(/refuse de taire/i);
  });
});
