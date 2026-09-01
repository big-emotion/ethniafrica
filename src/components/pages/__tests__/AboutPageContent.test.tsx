import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AboutPageContent from "../AboutPageContent";
import { ACCESS_MODE_LABELS } from "@/lib/hubs/moduleRegistry";
import { getLocalizedRoute } from "@/lib/routing";
import type { HubModule } from "@/lib/hubs/moduleAvailability";
import type { AccessMode } from "@/lib/hubs/moduleRegistry";
import type { CorpusCounts } from "@/lib/home/corpusCounts";
import type { CountrySynthesis } from "@/lib/home/countrySynthesis";

const counts: CorpusCounts = {
  peoples: 4213,
  countries: 91,
  families: 37,
  migrations: 5,
};

const modulesByAxis: Record<AccessMode, HubModule[]> = {
  explorer: [],
  comprendre: [],
  jouer: [],
};

const syntheses: CountrySynthesis[] = [
  {
    id: "BDI",
    nameFr: "Burundi",
    summary: "Chapeau du Burundi.",
    formerNames: [],
    peoples: [{ name: "Peuple test", peopleId: "PPL_TEST" }],
    kingdoms: [],
    languages: ["kirundi"],
  },
];

const renderAbout = () =>
  render(
    <AboutPageContent
      language="fr"
      counts={counts}
      modulesByAxis={modulesByAxis}
      syntheses={syntheses}
    />
  );

function headingLevels(container: HTMLElement): number[] {
  return Array.from(container.querySelectorAll("h1,h2,h3,h4,h5,h6")).map(
    (heading) => Number(heading.tagName[1])
  );
}

function expectNoSkippedHeadingLevels(levels: number[]) {
  let highestLevelSeen = 0;

  for (const level of levels) {
    expect(level).toBeLessThanOrEqual(highestLevelSeen + 1);
    highestLevelSeen = Math.max(highestLevelSeen, level);
  }
}

describe("AboutPageContent (REQ-132)", () => {
  // @req REQ-132
  it("opens with a clear overview of EthniAfrica", () => {
    renderAbout();

    expect(
      screen.getByRole("heading", { level: 1, name: "À propos" })
    ).toBeTruthy();
    expect(screen.getByTestId("about-overview")).toHaveTextContent(
      /EthniAfrica est un atlas éditorial/i
    );
  });

  // @req REQ-132
  it("names the four distinct families of content in the corpus", () => {
    renderAbout();

    const families = screen.getByTestId("about-content-families");
    for (const family of [
      "Peuples",
      "Langues",
      "Familles linguistiques",
      "Pays",
    ]) {
      expect(
        within(families).getByRole("heading", { level: 3, name: family })
      ).toBeTruthy();
    }
  });

  // @req REQ-132
  it("renders the existing purpose argument after the overview", () => {
    const { container } = renderAbout();

    const overview = screen.getByTestId("about-overview");
    const purpose = screen.getByTestId("home-purpose-blocks");
    const corpus = screen.getByTestId("about-content-families");

    expect(
      overview.compareDocumentPosition(purpose) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      purpose.compareDocumentPosition(corpus) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      container.querySelectorAll('[data-testid="home-purpose-blocks"]')
    ).toHaveLength(1);
  });

  // @req REQ-132
  it("places the corpus synthesis before the existing three access axes", () => {
    renderAbout();

    const corpus = screen.getByTestId("about-content-families");
    const synthesis = screen.getByTestId("home-synthesis-rail");
    const axes = screen.getByTestId("access-axes");

    expect(
      corpus.compareDocumentPosition(synthesis) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      synthesis.compareDocumentPosition(axes) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  // @req REQ-132
  it("preserves the access framing around one interactive axis-card set", () => {
    renderAbout();

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Trois manières d’entrer dans l’atlas",
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Le même corpus se parcourt selon l’intention du moment : chercher une fiche, approfondir une question ou mettre ses repères à l’épreuve.",
        { exact: true }
      )
    ).toBeInTheDocument();

    for (const description of [
      "Retrouver une fiche et parcourir le corpus par peuple, famille linguistique, pays ou appellation.",
      "Suivre les sujets qui traversent plusieurs fiches et replacer les informations dans leur contexte.",
      "Interroger ses repères grâce aux jeux construits à partir du corpus.",
    ]) {
      expect(
        screen.getByText(description, { exact: true })
      ).toBeInTheDocument();
    }

    expect(screen.queryByTestId("about-access-modes")).toBeNull();
    expect(
      screen.getAllByTestId(/^access-axis-(explorer|comprendre|jouer)$/)
    ).toHaveLength(3);

    for (const name of Object.values(ACCESS_MODE_LABELS)) {
      expect(screen.getAllByRole("heading", { level: 3, name })).toHaveLength(
        1
      );
    }
  });

  // @req REQ-132
  it("names the static access-modes section with the current axis labels", () => {
    renderAbout();

    const staticItems = screen.getByTestId("about-access-mode-list");
    for (const name of Object.values(ACCESS_MODE_LABELS)) {
      expect(within(staticItems).getByText(name)).toBeInTheDocument();
    }

    expect(within(staticItems).queryByText("Explorer")).toBeNull();
    expect(within(staticItems).queryByText("Comprendre")).toBeNull();
  });

  // @req REQ-132
  it("distinguishes this project overview from the Doctrine and links to it", () => {
    renderAbout();

    const distinction = screen.getByTestId("about-doctrine-distinction");
    expect(distinction).toHaveTextContent(
      /La page À propos présente le projet/i
    );
    expect(distinction).toHaveTextContent(
      /La Doctrine explique comment les affirmations sont établies/i
    );
    expect(
      within(distinction).getByRole("link", {
        name: "Consulter la Doctrine éditoriale",
      })
    ).toHaveAttribute("href", getLocalizedRoute("fr", "doctrine"));
  });

  // @req REQ-132
  it("keeps one valid H1 → H2 → H3 document outline", () => {
    const { container } = renderAbout();
    const levels = headingLevels(container);

    expect(levels.filter((level) => level === 1)).toHaveLength(1);
    expectNoSkippedHeadingLevels(levels);
  });

  // @req REQ-132
  it("declares mobile-first grids that widen at tablet and editorial desktop", () => {
    renderAbout();

    const families = screen.getByTestId("about-content-families");
    expect(families.className).toMatch(/grid-cols-1/);
    expect(families.className).toMatch(/min-\[720px\]:grid-cols-2/);
    expect(families.className).toMatch(/min-\[1240px\]:grid-cols-4/);

    const axes = screen.getByTestId("access-axes");
    expect(axes.className).toContain("access-axes");
  });

  // @req REQ-132
  it("keeps the source bibliography available through accessible links", () => {
    renderAbout();

    expect(
      screen.getByRole("heading", { level: 2, name: "Sources" })
    ).toBeTruthy();
    expect(
      screen.getByRole("link", {
        name: /United Nations, Department of Economic and Social Affairs/i,
      })
    ).toHaveAttribute("href", "https://population.un.org/wpp/");
  });
});
