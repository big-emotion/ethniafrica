import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DidYouKnowLoader } from "@/components/system/DidYouKnowLoader";
import { LOADER_REVEAL_DELAY_MS } from "@/components/system/AfricaTraceLoader";
import type { DidYouKnowFact } from "@/lib/home/didYouKnowFacts";

const FACT: DidYouKnowFact = {
  id: "cote-ivoire",
  headline: "La Côte d'Ivoire porte le nom de ce qu'on y achetait.",
  body: [
    "Les navigateurs portugais désignaient ce littoral par sa marchandise.",
    "En 1839, Bouët-Willaumez francise l'appellation et la fixe.",
  ],
  entities: [
    { kind: "country", id: "CIV", label: "Côte d'Ivoire" },
    { kind: "people", id: "PPL_BAOULE", label: "Baoulé" },
  ],
  tier: "referenced",
};

const styleSheetOf = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("style"))
    .map((node) => node.textContent ?? "")
    .join("\n");

describe("DidYouKnowLoader (REQ-104 — the wait is spent reading)", () => {
  // @req REQ-104
  it("announces the wait to assistive technology with the label it was given", () => {
    render(<DidYouKnowLoader fact={FACT} label="Chargement de l'atlas" />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Chargement de l'atlas"
    );
  });

  // @req REQ-104
  it("gives the reader the fact, not a bare indicator", () => {
    render(<DidYouKnowLoader fact={FACT} label="Chargement" />);

    expect(screen.getByText("Saviez-vous que")).toBeInTheDocument();
    expect(screen.getByText(FACT.headline)).toBeInTheDocument();
    for (const paragraph of FACT.body) {
      expect(screen.getByText(paragraph)).toBeInTheDocument();
    }
  });

  // The image is a document supporting the anecdote, not loading chrome. It
  // therefore keeps both its description and its visible licence credit.
  // @req REQ-104 @req REQ-113
  it("pairs the fact with its credited illustration", () => {
    const { container } = render(
      <DidYouKnowLoader fact={FACT} label="Chargement" />
    );

    expect(
      screen.getByRole("img", {
        name: /Défense d'éléphant sculptée/i,
      })
    ).toBeInTheDocument();
    expect(screen.getByText(/Brooklyn Museum/)).toBeInTheDocument();
    expect(container.querySelector(".afh-dykl-split")).toHaveClass(
      "afh-dykl-split--image-start"
    );
  });

  // Bank order determines the side, so consecutive illustrations do not all
  // settle into the same template on wider screens.
  // @req REQ-104 @req REQ-113
  it("alternates the illustration side across facts", () => {
    const { container, rerender } = render(
      <DidYouKnowLoader fact={FACT} label="Chargement" />
    );

    rerender(
      <DidYouKnowLoader fact={{ ...FACT, id: "amazigh" }} label="Chargement" />
    );

    expect(container.querySelector(".afh-dykl-split")).toHaveClass(
      "afh-dykl-split--image-end"
    );
  });

  // @req REQ-104
  it("states the tier of the source behind the fact", () => {
    render(<DidYouKnowLoader fact={FACT} label="Chargement" />);

    expect(screen.getByText("Source référencée")).toBeInTheDocument();
  });

  // @req REQ-104
  it("names the entities without offering them as links", () => {
    // The home band's chips are exits into the atlas. Here the surface is
    // about to be replaced by the page the reader already asked for, so a
    // link is a focus target that vanishes under the pointer — the chips
    // stay as labels and nothing is focusable inside the wait.
    const { container } = render(
      <DidYouKnowLoader fact={FACT} label="Chargement" />
    );

    expect(screen.getByText("Côte d'Ivoire")).toBeInTheDocument();
    expect(screen.getByText("Baoulé")).toBeInTheDocument();
    expect(container.querySelectorAll("a")).toHaveLength(0);
    expect(container.querySelectorAll("button")).toHaveLength(0);
  });

  // @req REQ-104
  it("still reports the wait when the bank has no fact to give", () => {
    // An empty bank must not turn a wait into a blank screen: the reader is
    // waiting whether or not there is something to read.
    render(<DidYouKnowLoader fact={null} label="Chargement de l'atlas" />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Chargement de l'atlas"
    );
    expect(screen.queryByText("Saviez-vous que")).not.toBeInTheDocument();
  });

  // @req REQ-104
  it("holds itself invisible until the wait is long enough to be worth reporting", () => {
    const { container } = render(
      <DidYouKnowLoader fact={FACT} label="Chargement" />
    );

    expect(styleSheetOf(container)).toContain(`${LOADER_REVEAL_DELAY_MS}ms`);
    expect(styleSheetOf(container)).toMatch(/animation:[^;]*both/);
  });

  // @req REQ-104
  it("unveils the fact in reading order rather than all at once", () => {
    // The point of the surface is that the wait is spent reading. A block
    // that appears whole is a wall; one that arrives line by line is paced
    // to the eye that is already moving down it.
    const { container } = render(
      <DidYouKnowLoader fact={FACT} label="Chargement" />
    );
    const styleSheet = styleSheetOf(container);

    const delays = Array.from(
      styleSheet.matchAll(/--afh-dykl-step:\s*(\d+)/g)
    ).map((match) => Number(match[1]));

    expect(delays.length).toBeGreaterThanOrEqual(4);
    expect([...delays]).toEqual([...delays].sort((a, b) => a - b));
    expect(new Set(delays).size).toBe(delays.length);
  });

  // @req REQ-104
  it("takes its durations and easings from the motion tokens, never from literals", () => {
    const { container } = render(
      <DidYouKnowLoader fact={FACT} label="Chargement" />
    );
    const styleSheet = styleSheetOf(container);

    expect(styleSheet).toContain("var(--afh-duration-fade)");
    expect(styleSheet).toContain("var(--afh-ease-spring)");
  });

  // @req REQ-104
  it("takes its colours from tokens, so the accent scope it sits in drives the ink", () => {
    const { container } = render(
      <DidYouKnowLoader fact={FACT} label="Chargement" />
    );
    const styleSheet = styleSheetOf(container);

    expect(styleSheet).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(styleSheet).not.toMatch(/\brgba?\(/);
  });

  // @req REQ-104
  it("drops the rise under prefers-reduced-motion, leaving the fact readable", () => {
    // Charter §6: only opacity survives. A reader who asked for less motion
    // must still get the fact — never a surface stuck mid-reveal.
    const { container } = render(
      <DidYouKnowLoader fact={FACT} label="Chargement" />
    );
    const styleSheet = styleSheetOf(container);

    expect(styleSheet).toContain("prefers-reduced-motion: reduce");
    const reducedBlock = styleSheet.slice(
      styleSheet.indexOf("prefers-reduced-motion: reduce")
    );
    expect(reducedBlock).toContain("transform: none");
    // The stagger is the motion; the 300 ms threshold is a perception
    // guard and survives here, exactly as AfricaTraceLoader keeps its own.
    expect(reducedBlock).toMatch(/--afh-dykl-stagger:\s*0m?s/);
  });
});
