import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HomeHero } from "@/components/home/HomeHero";
import { PRODUCT_NAME } from "@/lib/brand";

describe("HomeHero — parchment light hero (ETNI-820)", () => {
  // @req REQ-044
  it("renders no eyebrow and no PRODUCT_NAME line", () => {
    render(<HomeHero />);
    expect(screen.queryByText(PRODUCT_NAME)).not.toBeInTheDocument();
    expect(
      screen.queryByText("EXPLORER · COMPRENDRE · JOUER")
    ).not.toBeInTheDocument();
  });

  // @req REQ-044
  it("renders a single H1 with the exact verbatim headline and zero H3", () => {
    render(<HomeHero />);
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);

    const h1 = headings[0];
    expect(h1.textContent?.replace(/\s+/g, " ").trim()).toBe(
      "Le continent raconté comme une carte vivante"
    );
    expect(screen.queryAllByRole("heading", { level: 3 })).toHaveLength(0);
  });

  // @req REQ-044
  it("gives the italic accent on « carte vivante » the terre accent colour", () => {
    render(<HomeHero />);
    const heading = screen.getByRole("heading", { level: 1 });
    const em = heading.querySelector("em");

    expect(em).toHaveTextContent("carte vivante");
    expect(em?.getAttribute("style")).toContain("var(--afh-cat-terre)");
  });

  // @req REQ-044
  it("renders the lede with the verifiable-source clause", () => {
    render(<HomeHero />);
    expect(screen.getByText(/source vérifiable/i)).toBeInTheDocument();
  });

  // @req REQ-044
  it("renders a trust note distinct from the lede", () => {
    render(<HomeHero />);
    const lede = screen.getByText(/source vérifiable/i);
    const trustNote = screen.getByTestId("home-hero-trust-note");

    expect(trustNote).toBeInTheDocument();
    expect(trustNote).not.toBe(lede);
  });

  // @req REQ-044
  it("composes DottedContinent behind the content", () => {
    const { container } = render(<HomeHero />);
    const canvas = container.querySelector("canvas");

    expect(canvas).toBeInTheDocument();
    expect(canvas).toHaveAttribute("aria-hidden", "true");
  });

  // @req REQ-044
  it("uses the parchment surface, not the night ground", () => {
    const { container } = render(<HomeHero />);
    const section = container.querySelector("section");

    expect(section?.getAttribute("style")).toContain("var(--afh-bg-warm)");
    expect(section?.getAttribute("style")).not.toContain(
      "var(--afh-night-ground)"
    );
  });
});
