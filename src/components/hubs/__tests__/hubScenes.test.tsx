import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ComprendreQuestionSpine } from "@/components/hubs/ComprendreQuestionSpine";
import { JouerFaceOff } from "@/components/hubs/JouerFaceOff";
import { getLocalizedRoute } from "@/lib/routing";
import type { HubModule } from "@/lib/hubs/moduleAvailability";

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
    availability: "flagged",
    featureFlag: "quiz",
    available: false,
  },
  {
    id: "liens",
    name: "Les liens invisibles",
    accessMode: "jouer",
    page: null,
    availability: "unavailable",
    available: false,
  },
];

describe("ComprendreQuestionSpine — the question axis scene (REQ-114)", () => {
  // A reader arrives at Comprendre with a question, so the scene shows
  // questions. Showing module names again is what made the three hubs
  // indistinguishable in the first place.
  // @req REQ-114
  it("puts the reader's question first, not the module that answers it", () => {
    render(<ComprendreQuestionSpine language="fr" />);

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
    render(<ComprendreQuestionSpine language="fr" />);

    expect(screen.getByTestId("comprendre-spine-stop-names")).toHaveAttribute(
      "href",
      getLocalizedRoute("fr", "names")
    );
    expect(
      screen.getByTestId("comprendre-spine-stop-migrations")
    ).toHaveAttribute("href", getLocalizedRoute("fr", "migrations"));
    expect(
      screen.getByTestId("comprendre-spine-stop-doctrine")
    ).toHaveAttribute("href", getLocalizedRoute("fr", "doctrine"));
  });

  // The stops are a sequence, from the most concrete question to the
  // method governing every answer — an ordered list, not a bag of links.
  // @req REQ-114
  it("presents the stops as an ordered sequence", () => {
    render(<ComprendreQuestionSpine language="fr" />);

    const stops = screen.getAllByRole("listitem");
    expect(stops).toHaveLength(3);
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
