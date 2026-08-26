import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AccessModeHub } from "@/components/hubs/AccessModeHub";
import { getLocalizedRoute } from "@/lib/routing";
import type { HubModule } from "@/lib/hubs/moduleAvailability";

const explorerModules: HubModule[] = [
  {
    id: "peuples",
    name: "Les peuples d'Afrique",
    accessMode: "explorer",
    page: "peoples",
    availability: "data",
    dataSource: "afrik_peoples",
    available: true,
  },
  {
    id: "recherche",
    name: "Recherche libre",
    accessMode: "explorer",
    page: "search",
    availability: "static",
    available: true,
  },
  {
    id: "noms",
    name: "Noms & appellations",
    accessMode: "explorer",
    page: "names",
    availability: "data",
    dataSource: "name_records",
    available: false,
  },
];

const jouerModules: HubModule[] = [
  {
    id: "quiz",
    name: "Le quiz",
    accessMode: "jouer",
    page: "quiz",
    availability: "data",
    dataSource: "quiz_questions",
    available: true,
  },
  {
    id: "comparer",
    name: "Vraie taille",
    accessMode: "jouer",
    page: null,
    gameSlug: "vraie-taille",
    availability: "data",
    dataSource: "afrik_countries",
    available: true,
  },
  {
    id: "liens",
    name: "Les liens invisibles",
    accessMode: "jouer",
    page: null,
    gameSlug: "liens",
    availability: "data",
    dataSource: "afrik_people_relations",
    available: false,
  },
];

describe("AccessModeHub — hub component (REQ-114/REQ-106)", () => {
  // @req REQ-114
  it("renders the hub title for the access mode", () => {
    render(
      <AccessModeHub language="fr" mode="explorer" modules={explorerModules} />
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Explorer" })
    ).toBeInTheDocument();
  });

  // The blurb is what tells a reader why they would pick this axis over
  // the other two, so the hub says it rather than leaving the verb bare.
  // @req REQ-114
  it("states what the axis is for alongside its title", () => {
    render(
      <AccessModeHub language="fr" mode="explorer" modules={explorerModules} />
    );

    expect(
      screen.getByTestId("access-mode-hub-explorer-blurb")
    ).toHaveTextContent("Quand on sait ce qu'on cherche");
  });

  // @req REQ-114 @req REQ-106
  it("renders a live module as a link to its route", () => {
    render(
      <AccessModeHub language="fr" mode="explorer" modules={explorerModules} />
    );

    const link = screen.getByTestId("hub-module-link-peuples");
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", getLocalizedRoute("fr", "peoples"));
  });

  // @req REQ-114 @req REQ-106
  it("renders a static module as a link without waiting on any data", () => {
    render(
      <AccessModeHub language="fr" mode="explorer" modules={explorerModules} />
    );

    const link = screen.getByTestId("hub-module-link-recherche");
    expect(link).toHaveAttribute("href", getLocalizedRoute("fr", "search"));
  });

  // @req REQ-114 @req REQ-106
  it("renders an unavailable data module with no anchor element", () => {
    render(
      <AccessModeHub language="fr" mode="explorer" modules={explorerModules} />
    );

    expect(
      screen.getByTestId("hub-module-unavailable-noms")
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("hub-module-link-noms")
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId("hub-module-unavailable-noms").querySelector("a")
    ).toBeNull();
  });

  // A game has no PageType of its own: it is reached by slug under the
  // Jouer hub, and the slug has to win over whatever page the module carries.
  // @req REQ-120
  it("links a game to its slug under the jouer hub", () => {
    render(<AccessModeHub language="fr" mode="jouer" modules={jouerModules} />);

    const link = screen.getByTestId("hub-module-link-comparer");
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "/fr/jouer/vraie-taille");
    expect(link).toHaveTextContent("Vraie taille");
  });

  // The quiz keeps a real PageType, so it must still route through it.
  // @req REQ-120
  it("links the quiz to its own route rather than to a game slug", () => {
    render(<AccessModeHub language="fr" mode="jouer" modules={jouerModules} />);

    expect(screen.getByTestId("hub-module-link-quiz")).toHaveAttribute(
      "href",
      getLocalizedRoute("fr", "quiz")
    );
  });

  // @req REQ-120
  it("renders a game whose data source is empty with no anchor element", () => {
    render(<AccessModeHub language="fr" mode="jouer" modules={jouerModules} />);

    expect(
      screen.getByTestId("hub-module-unavailable-liens")
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("hub-module-link-liens")
    ).not.toBeInTheDocument();
  });

  // @req REQ-106
  it("labels every unavailable module Bientôt", () => {
    render(
      <AccessModeHub language="fr" mode="explorer" modules={explorerModules} />
    );

    expect(screen.getByTestId("hub-module-unavailable-noms")).toHaveTextContent(
      "Bientôt"
    );
  });

  // @req REQ-114
  it("scopes the hub to its own categorical accent", () => {
    const { rerender } = render(
      <AccessModeHub language="fr" mode="explorer" modules={explorerModules} />
    );
    expect(screen.getByTestId("access-mode-hub-explorer")).toHaveClass(
      "afh-accent-ocre"
    );

    rerender(
      <AccessModeHub language="fr" mode="jouer" modules={jouerModules} />
    );
    expect(screen.getByTestId("access-mode-hub-jouer")).toHaveClass(
      "afh-accent-perv"
    );
  });
});
