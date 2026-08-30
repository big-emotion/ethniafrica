import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CountrySynthesisBrief } from "@/components/fiche/CountrySynthesisBrief";
import type { CountrySynthesis } from "@/lib/home/countrySynthesis";

const NIGERIA: CountrySynthesis = {
  id: "NGA",
  nameFr: "Nigeria",
  summary:
    "Le pays le plus peuplé du continent, façonné par les royaumes du Sahel et du delta du Niger.",
  formerNames: ["Protectorat du Nord", "Colonie et protectorat du Nigeria"],
  peoples: [
    { name: "Yoruba", peopleId: "PPL_YORUBA" },
    { name: "Igbo", peopleId: "PPL_IGBO" },
  ],
  kingdoms: ["Oyo", "Bénin"],
  languages: ["haoussa", "yoruba", "igbo"],
};

const briefFor = (synthesis: CountrySynthesis) =>
  render(<CountrySynthesisBrief synthesis={synthesis} />);

describe("CountrySynthesisBrief", () => {
  // @req REQ-113
  it("opens the fiche on the chapeau the corpus wrote", () => {
    briefFor(NIGERIA);

    expect(screen.getByText(/le plus peuplé du continent/i)).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: /Nigeria — synthèse/ })
    ).toBeTruthy();
  });

  // The former names are the one fact the brief holds that nothing else on the
  // page does: countryDataTransformer never reads historicalNames.formerNames,
  // so dropping this row would delete it from the fiche outright.
  // @req REQ-113
  it("carries the former names, which no section below repeats", () => {
    briefFor(NIGERIA);

    expect(screen.getByText(/Protectorat du Nord/)).toBeTruthy();
  });

  // The brief was written as "the eight chapters compressed", above the eight.
  // There are no chapters: it stands between the globe and a parchment that
  // states each of these three at length — the peoples with their shares and
  // their own links, the kingdoms on a dated timeline, the languages with
  // their family. A summary of the thing directly beneath it is not a summary,
  // it is the same page twice.
  // @req REQ-113
  it("restates none of the sections the parchment below already carries", () => {
    briefFor(NIGERIA);

    expect(screen.queryByText(/Groupes ethniques principaux/)).toBeNull();
    expect(screen.queryByText(/Héritage historique/)).toBeNull();
    expect(screen.queryByText(/Langues et identité/)).toBeNull();
    expect(screen.queryByText("Yoruba")).toBeNull();
    expect(screen.queryByText(/Oyo/)).toBeNull();
    expect(screen.queryByText(/haoussa/)).toBeNull();
  });

  // Charter §4: a surface says what the corpus does not hold rather than
  // dressing the absence. With neither chapeau nor former names there is no
  // brief to write, and the fiche opens straight onto its parchment.
  // @req REQ-113
  it("renders nothing when the corpus fills neither field it still holds", () => {
    const { container } = briefFor({
      ...NIGERIA,
      summary: null,
      formerNames: [],
    });

    expect(container.firstChild).toBeNull();
  });

  // @req REQ-113
  it("still opens on former names alone when the chapeau is missing", () => {
    briefFor({ ...NIGERIA, summary: null });

    expect(screen.getByTestId("country-synthesis-brief")).toBeTruthy();
    expect(screen.getByText(/Protectorat du Nord/)).toBeTruthy();
  });
});
