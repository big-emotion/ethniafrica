import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HomeHero } from "@/components/home/HomeHero";
import { PRODUCT_NAME } from "@/lib/brand";

describe("HomeHero", () => {
  // @req REQ-044
  it("renders the eyebrow with the exact copy", () => {
    render(<HomeHero />);
    expect(
      screen.getByText("EXPLORER · COMPRENDRE · JOUER")
    ).toBeInTheDocument();
  });

  // @req REQ-044
  it("renders a single H1 with the exact copy, a hard line break after « raconté », and an italic accent on « carte vivante »", () => {
    render(<HomeHero />);
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    const h1 = headings[0];

    expect(h1.querySelector("br")).toBeInTheDocument();
    expect(h1.querySelector("em")).toHaveTextContent("carte vivante");
    expect(h1.textContent?.replace(/\s+/g, " ").trim()).toBe(
      "Le continent raconté comme une carte vivante"
    );
  });

  // @req REQ-044
  it("renders the adapted lede copy", () => {
    render(<HomeHero />);
    expect(
      screen.getByText(
        "Peuples, langues, noms et migrations : l'histoire africaine racontée depuis son propre regard — chaque affirmation adossée à une source vérifiable."
      )
    ).toBeInTheDocument();
  });

  // @req REQ-044
  it("composes DottedContinent behind the content", () => {
    const { container } = render(<HomeHero />);
    const canvas = container.querySelector("canvas");

    expect(canvas).toBeInTheDocument();
    expect(canvas).toHaveAttribute("aria-hidden", "true");
  });

  // @req REQ-044
  it("sources the brand line from src/lib/brand.ts, never hardcoded", () => {
    render(<HomeHero />);
    expect(screen.getByText(PRODUCT_NAME)).toBeInTheDocument();
  });
});
