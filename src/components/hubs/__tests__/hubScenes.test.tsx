import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ComprendreQuestionSpine } from "@/components/hubs/ComprendreQuestionSpine";
import { JouerProjectionContrast } from "@/components/hubs/JouerProjectionContrast";
import { getLocalizedRoute } from "@/lib/routing";
import { getTranslation } from "@/lib/translations";
import type { HubModule } from "@/lib/hubs/moduleAvailability";

/**
 * The spine reads the same resolved availability the hub rows read, so its
 * fixtures are HubModule, not a hand-kept list of routes (atlas-charter §3).
 */
function comprendreModules(
  overrides: Partial<Record<string, boolean>> = {}
): HubModule[] {
  return [
    {
      id: "noms",
      name: "Noms & appellations",
      accessMode: "comprendre",
      page: "names",
      availability: "data",
      editorialReadiness: "ready",
      available: overrides.noms ?? true,
    },
    {
      id: "frise",
      name: "Premiers repères de migrations",
      accessMode: "comprendre",
      page: "migrations",
      availability: "data",
      editorialReadiness: "ready",
      available: overrides.frise ?? true,
    },
    {
      id: "doctrine",
      name: "La doctrine éditoriale",
      accessMode: "comprendre",
      page: "doctrine",
      availability: "static",
      editorialReadiness: "ready",
      available: overrides.doctrine ?? true,
    },
  ];
}

const jouerModules: HubModule[] = [
  {
    id: "comparer",
    name: "Comparer deux peuples",
    accessMode: "jouer",
    page: "compare",
    availability: "static",
    available: true,
  },
  {
    id: "quiz",
    name: "Le quiz des parcours",
    accessMode: "jouer",
    page: "quiz",
    availability: "data",
    available: false,
  },
  {
    id: "liens",
    name: "Les liens invisibles",
    accessMode: "jouer",
    page: null,
    availability: "data",
    available: false,
  },
];

describe("ComprendreQuestionSpine — the question axis scene (REQ-114)", () => {
  // A reader arrives at Comprendre with a question, so the scene shows
  // questions. Showing module names again is what made the three hubs
  // indistinguishable in the first place.
  // @req REQ-114
  it("puts the reader's question first, not the module that answers it", () => {
    render(
      <ComprendreQuestionSpine language="fr" modules={comprendreModules()} />
    );

    expect(
      screen.getByText("Pourquoi ce peuple porte-t-il ce nom ?")
    ).toBeInTheDocument();
    expect(
      screen.getByText("D'où viennent-ils, et quand ?")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Qui dit ça, et sur quelle source ?")
    ).toBeInTheDocument();
  });

  // @req REQ-114
  it("routes each question to the module that answers it", () => {
    render(
      <ComprendreQuestionSpine language="fr" modules={comprendreModules()} />
    );

    expect(screen.getByTestId("comprendre-spine-stop-noms")).toHaveAttribute(
      "href",
      getLocalizedRoute("fr", "names")
    );
    expect(screen.getByTestId("comprendre-spine-stop-frise")).toHaveAttribute(
      "href",
      getLocalizedRoute("fr", "migrations")
    );
    expect(
      screen.getByTestId("comprendre-spine-stop-doctrine")
    ).toHaveAttribute("href", getLocalizedRoute("fr", "doctrine"));
  });

  // The stops are a sequence, from the most concrete question to the
  // method governing every answer — an ordered list, not a bag of links.
  // @req REQ-114
  it("presents the stops as an ordered sequence", () => {
    render(
      <ComprendreQuestionSpine language="fr" modules={comprendreModules()} />
    );

    const stops = screen.getAllByRole("listitem");
    expect(stops).toHaveLength(3);
  });

  /**
   * The defect this closes: /fr/comprendre linked "Noms & appellations" from
   * the spine while the row directly above it marked that same module
   * **Bientôt**. One page, two contrary claims about one module.
   */
  // @req REQ-114 @req REQ-106
  it("stops offering a question the corpus cannot answer yet", () => {
    render(
      <ComprendreQuestionSpine
        language="fr"
        modules={comprendreModules({ noms: false })}
      />
    );

    expect(
      screen.queryByTestId("comprendre-spine-stop-noms")
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId("comprendre-spine-pending-noms")
    ).toBeInTheDocument();
    // The question survives: it is still what the axis is about, and the
    // reader is told where the answer will be rather than losing the stop.
    expect(
      screen.getByText("Pourquoi ce peuple porte-t-il ce nom ?")
    ).toBeInTheDocument();
  });

  // The scene and the rows beside it say the same word for the same state.
  // @req REQ-114 @req REQ-106
  it("marks a pending stop with the same label the hub rows use", () => {
    render(
      <ComprendreQuestionSpine
        language="fr"
        modules={comprendreModules({ frise: false })}
      />
    );

    expect(
      screen.getByTestId("comprendre-spine-pending-frise")
    ).toHaveTextContent(getTranslation("fr").hubs.unavailableLabel);
  });

  // A stop the registry does not describe is a stop nobody can vouch for.
  // Rendering it as a link would resurrect the hand-kept route list the
  // charter forbids.
  // @req REQ-114 @req REQ-106
  it("offers no link for a module the hub did not hand it", () => {
    render(<ComprendreQuestionSpine language="fr" modules={[]} />);

    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });
});

describe("JouerProjectionContrast — the counter-fact scene (REQ-114)", () => {
  // The axis puts the reader to the test, so the scene shows them something
  // they already believe and takes it away. The scene it replaced advertised
  // "un résultat" — the score, which the games charter §7 calls the pretext
  // rather than the product.
  // @req REQ-114
  it("states the belief and the measurement that overturns it", () => {
    render(<JouerProjectionContrast modules={jouerModules} />);

    expect(screen.getByText("Ce que la carte vous montre")).toBeInTheDocument();
    expect(screen.getByText("Ce que mesure la sphère")).toBeInTheDocument();

    // Both panels name their subject: the reversal is only legible if the
    // reader can see which country swapped places with which.
    const scene = screen.getByTestId("jouer-projection-contrast");
    expect(scene).toHaveTextContent("Le Groenland plus vaste");
    expect(scene).toHaveTextContent("que la RD Congo");
    expect(scene).toHaveTextContent("La RD Congo plus vaste");
  });

  // Every figure is measured off the committed outlines at render time. A
  // hard-coded percentage is exactly how a page ends up asserting something
  // its own data stopped supporting.
  // @req REQ-114 @req REQ-120
  it("prints the measured gap and inflation rather than typed numbers", () => {
    render(<JouerProjectionContrast modules={jouerModules} />);
    const scene = screen.getByTestId("jouer-projection-contrast");

    // Measured off the committed outlines: the DR Congo is 8,7% larger and
    // Greenland is drawn 14,3 times too big. Asserting the literals means a
    // regenerated asset fails here loudly, which is right — the scene's
    // claim would have changed.
    expect(scene.textContent).toMatch(/8,7\s?%/);
    expect(scene.textContent).toMatch(/14,3\sfois/);
  });

  // @req REQ-114 @req REQ-106
  it("counts only the ways to check that are actually live", () => {
    render(<JouerProjectionContrast modules={jouerModules} />);

    expect(screen.getByTestId("jouer-contrast-count")).toHaveTextContent(
      "1 façon de le vérifier"
    );
  });

  // The old copy said "2 façons de jouer pour l'instant", which apologised
  // for the scope in the one line carrying information.
  // @req REQ-114 @req REQ-106
  it("says so plainly when nothing is live rather than promising a result", () => {
    render(
      <JouerProjectionContrast
        modules={jouerModules.map((module) => ({
          ...module,
          available: false,
        }))}
      />
    );

    expect(screen.getByTestId("jouer-contrast-count")).toHaveTextContent(
      "Aucune façon de le vérifier"
    );
  });

  // The drawing is the proof, not decoration, so it is announced rather than
  // hidden — and what it announces is the equal-scale fact a sighted reader
  // gets from the caption.
  // @req REQ-114
  it("gives the silhouettes an accessible name stating the shared scale", () => {
    render(<JouerProjectionContrast modules={jouerModules} />);

    const figure = screen.getByRole("img", { name: /même échelle/i });
    expect(figure).toBeInTheDocument();
  });

  // A scene that cannot measure its claim prints no claim. The count line
  // survives because it is the one thing that never depended on the asset.
  // @req REQ-114
  it("drops the claim rather than inventing one when the pair is unusable", () => {
    render(<JouerProjectionContrast modules={jouerModules} contrast={null} />);

    expect(
      screen.queryByText("Ce que la carte vous montre")
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("jouer-contrast-count")).toBeInTheDocument();
  });
});
