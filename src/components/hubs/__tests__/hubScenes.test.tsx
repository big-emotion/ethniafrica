import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ComprendreQuestionSpine } from "@/components/hubs/ComprendreQuestionSpine";
import { JouerFaceOff } from "@/components/hubs/JouerFaceOff";
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

describe("JouerFaceOff — the face-off scene (REQ-114)", () => {
  // The bargain the axis makes: nothing in, a result out. It is the only
  // thing separating Jouer from the two axes that ask the reader to bring
  // something with them.
  // @req REQ-114
  it("states what the reader brings and what they leave with", () => {
    render(<JouerFaceOff modules={jouerModules} />);

    expect(screen.getByText("Vous apportez")).toBeInTheDocument();
    expect(screen.getByText("rien")).toBeInTheDocument();
    expect(screen.getByText("Vous repartez avec")).toBeInTheDocument();
    expect(screen.getByText("un résultat")).toBeInTheDocument();
  });

  // @req REQ-114 @req REQ-106
  it("counts only the ways to play that are actually live", () => {
    render(<JouerFaceOff modules={jouerModules} />);

    expect(screen.getByTestId("jouer-face-off-count")).toHaveTextContent(
      "1 façon de jouer"
    );
  });

  // @req REQ-114 @req REQ-106
  it("says so plainly when nothing is live rather than promising a result", () => {
    render(
      <JouerFaceOff
        modules={jouerModules.map((module) => ({
          ...module,
          available: false,
        }))}
      />
    );

    expect(screen.getByTestId("jouer-face-off-count")).toHaveTextContent(
      "Aucune façon de jouer"
    );
  });

  // The converging discs are the axis glyph replayed at page scale; they
  // carry no information a screen reader needs.
  // @req REQ-114
  it("hides the decorative seam from assistive technology", () => {
    const { container } = render(<JouerFaceOff modules={jouerModules} />);

    expect(container.querySelector(".jouer-faceoff-seam")).toHaveAttribute(
      "aria-hidden",
      "true"
    );
  });
});
