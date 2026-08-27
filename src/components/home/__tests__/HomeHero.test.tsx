import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HomeHero } from "@/components/home/HomeHero";
import { PRODUCT_NAME } from "@/lib/brand";

describe("HomeHero — the band the home opens on (REQ-115)", () => {
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
      "Les peuples d'Afrique, sous le nom qu'ils se donnent"
    );
    expect(screen.queryAllByRole("heading", { level: 3 })).toHaveLength(0);
  });

  // The italic carries the thesis, so it has to survive both surfaces: set
  // as text it takes the display accent that flips with the theme, rather
  // than the night gold, which would go near-invisible on parchment.
  // @req REQ-044
  it("sets the autonym clause in italic on the surface's own display accent", () => {
    const { container } = render(<HomeHero />);
    const em = screen.getByRole("heading", { level: 1 }).querySelector("em");
    const styles = Array.from(container.querySelectorAll("style"))
      .map((style) => style.textContent)
      .join("\n");

    expect(em).toHaveTextContent("le nom qu'ils se donnent");
    expect(styles).toMatch(
      /\.home-hero-copy h1 em\s*{[^}]*var\(--afh-display-accent\)/
    );
  });

  // The lede names what the atlas holds and what it does with a name — the
  // two things a first-time reader cannot infer from the headline alone.
  // @req REQ-044
  it("renders one lede naming the corpus and what it asks of every name", () => {
    render(<HomeHero />);
    expect(
      screen.getByText(/leurs langues, leurs familles, leurs pays/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/qui l'a donné, depuis où et à quelle époque/i)
    ).toBeInTheDocument();
  });

  // The sourcing claim moved to the page's closing strip (TrustStrip), so
  // the hero states one thing rather than three.
  // @req REQ-044
  it("no longer carries the trust note it used to duplicate", () => {
    render(<HomeHero />);
    expect(
      screen.queryByTestId("home-hero-trust-note")
    ).not.toBeInTheDocument();
  });

  // @req REQ-044 @req REQ-112
  it("composes the home globe stage, never rendering empty", async () => {
    const { container } = render(<HomeHero />);

    // happy-dom has no WebGL, so the capability gate settles on the
    // committed AfricaBasemap fallback — see HomeGlobeStage.test.tsx for the
    // WebGL-available branch.
    await waitFor(() =>
      expect(
        container.querySelector("path#africa-landmass")
      ).toBeInTheDocument()
    );
  });

  // The whole band now follows the reader's choice, the globe's own panel
  // included: on parchment a dark panel was a hole punched through the
  // page, and the surface the reader picked has to reach the one thing
  // they came to the home to look at.
  // @req REQ-115
  it("puts the globe panel on the page surface rather than pinning it to night", () => {
    const { container } = render(<HomeHero />);
    const section = container.querySelector("section");
    const styles = Array.from(container.querySelectorAll("style"))
      .map((style) => style.textContent)
      .join("\n");

    expect(section).not.toHaveClass("afh-on-night");
    expect(container.querySelector(".home-globe-holder")).not.toHaveClass(
      "afh-on-night"
    );
    expect(styles).toMatch(/\.home-hero\s*{[^}]*background:\s*var\(--afh-bg\)/);
    expect(styles).toMatch(
      /\.home-globe-holder\s*{[^}]*background:\s*var\(--afh-bg\)/
    );
    expect(styles).not.toMatch(/var\(--afh-night-ground\)/);
  });

  // The globe carries its own readout, which also tracks the morph. A
  // second static caption beside it said less and covered it.
  // @req REQ-115
  it("leaves the globe to say what it is, rather than captioning it twice", () => {
    render(<HomeHero />);

    expect(screen.queryByTestId("home-globe-caption")).not.toBeInTheDocument();
  });

  // The band ends on a stated edge, not a fade: it is where the sky stops
  // and the archive starts.
  // @req REQ-115
  it("closes the band on an accent seam rather than a gradient", () => {
    const { container } = render(<HomeHero />);
    const styles = Array.from(container.querySelectorAll("style"))
      .map((style) => style.textContent)
      .join("\n");

    expect(container.querySelector(".home-hero-seam")).toBeInTheDocument();
    expect(styles).toMatch(
      /\.home-hero-seam\s*{[^}]*border-bottom:[^;]*var\(--afh-cat-ocre\)/
    );
  });

  // @req REQ-044 @req ETNI-822
  it("labels the hero section as an accessible landmark, matched by e2e/home-visual.spec.ts", () => {
    const { container } = render(<HomeHero />);
    const section = container.querySelector("section");

    expect(section).toHaveAttribute("aria-label", PRODUCT_NAME);
  });

  // @req REQ-115
  it("lays out the globe stage after the headline and lede in document order", () => {
    const { container } = render(<HomeHero />);
    const heading = screen.getByRole("heading", { level: 1 });
    const stage = container.querySelector(".home-globe-stage");

    expect(stage).not.toBeNull();
    expect(
      heading.compareDocumentPosition(stage as Element) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  // @req REQ-115
  it("declares a full-viewport min-height rule for the hero at desktop widths (>=1200px)", () => {
    const { container } = render(<HomeHero />);
    const styles = Array.from(container.querySelectorAll("style"))
      .map((style) => style.textContent)
      .join("\n");

    expect(container.querySelector("section.home-hero")).not.toBeNull();
    expect(styles).toMatch(
      /\.home-hero\s*{[^}]*min-height:\s*calc\(100dvh - 56px\)[^}]*}\s*}/
    );
    expect(styles).toMatch(/@media \(min-width:\s*1200px\)\s*{\s*\.home-hero/);
  });

  // @req REQ-115
  it("keeps the copy first and the globe after it, never overlaid behind", () => {
    const { container } = render(<HomeHero />);
    const copy = container.querySelector(".home-hero-copy");

    expect(copy).not.toBeNull();
    expect(container.querySelector("section")?.firstElementChild).toBe(copy);
  });
});
