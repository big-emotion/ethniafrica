import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { HomeHero } from "@/components/home/HomeHero";
import { PRODUCT_NAME } from "@/lib/brand";
import { HOME_HERO_IMAGES } from "@/lib/home/homeHeroVisuals";

// The band carries an interactive island since the search field landed in it,
// and useRouter throws outside an app-router tree rather than degrading.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

describe("HomeHero — the band the home opens on (REQ-115)", () => {
  // @req REQ-044
  it("renders no eyebrow and no standalone brand line", () => {
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
      "Qui sont les peuples d'Afrique ?"
    );
    expect(screen.queryAllByRole("heading", { level: 3 })).toHaveLength(0);
  });

  // The headline is the question the reader arrives with, so it stays a
  // question: a full stop here would turn the one line a first-time visitor
  // recognises as their own into an assertion about them.
  //
  // No italic clause any more. The accent used to fall on « le nom qu'ils se
  // donnent » because the headline was a nine-word thesis with a part worth
  // stressing; a five-word question has no subordinate to lift, and
  // italicising a fragment of it would stress nothing.
  // @req REQ-044
  it("keeps the headline interrogative and carries no italic clause", () => {
    render(<HomeHero />);
    const h1 = screen.getByRole("heading", { level: 1 });

    expect(h1.textContent?.trim().endsWith("?")).toBe(true);
    expect(h1.querySelector("em")).toBeNull();
  });

  // One sentence, not three registers. The band used to ask the reader to
  // hold seven items before the first scroll — four in the lede's list,
  // three in the standfirst's — and a reader retains one.
  // @req REQ-044
  it("answers the headline in exactly one sentence", () => {
    render(<HomeHero />);

    const answer = screen.getByTestId("home-hero-answer");
    const sentences = answer
      .textContent!.split(/(?<=\.)\s+/)
      .filter((part) => part.trim().length > 0);

    expect(sentences).toHaveLength(1);
    expect(answer).toHaveTextContent(/y répond peuple par peuple/i);
    expect(answer).toHaveTextContent(/la source de chaque réponse/i);
  });

  // The band holds one paragraph. A second one is how the lede and the
  // standfirst grew back the last time.
  // @req REQ-044
  it("holds one paragraph and no separating rule", () => {
    const { container } = render(<HomeHero />);
    const styles = Array.from(container.querySelectorAll("style"))
      .map((style) => style.textContent)
      .join("\n");

    expect(container.querySelectorAll(".home-hero-copy p")).toHaveLength(1);
    expect(container.querySelector(".home-hero-lede")).toBeNull();
    expect(container.querySelector(".home-hero-standfirst")).toBeNull();
    expect(styles).not.toMatch(/\.home-hero-answer\s*\{[^}]*border-top/);
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

  // ETNI-1404 restores the shared Mercator globe as the search-first hero's
  // visual without restoring the retired featured-module wrapper.
  // @req REQ-115 @req ETNI-1404
  it("holds the shared globe directly, not the old module slot", () => {
    const { container } = render(<HomeHero />);

    expect(container.querySelector(".home-globe-holder")).toBeNull();
    expect(container.querySelector(".home-globe-stage")).not.toBeNull();
  });

  // The band stays on the reader's chosen surface: on parchment a dark
  // panel was a hole punched through the page.
  // @req REQ-115
  it("stays on the page surface rather than pinning itself to night", () => {
    const { container } = render(<HomeHero />);
    const styles = Array.from(container.querySelectorAll("style"))
      .map((style) => style.textContent)
      .join("\n");

    expect(container.querySelector("section")).not.toHaveClass("afh-on-night");
    expect(styles).toMatch(
      /\.home-hero\s*\{[^}]*background:\s*var\(--afh-bg\)/
    );
    expect(styles).not.toMatch(/var\(--afh-night-ground\)/);
  });

  // Asserted on the source, because no render here can see the defect: the
  // runner's JSX transform keeps the space that Next's drops, so the page
  // said « EthniAfricapublie » while every assertion above stayed green.
  // What is guarded is therefore the shape that removes the question — the
  // sentence is one string, and the name is interpolated into it.
  // @req REQ-044
  it("carries the product name inside the sentence, not beside it", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/home/HomeHero.tsx"),
      "utf8"
    );

    expect(source).toMatch(/\$\{PRODUCT_NAME\} y répond/);
    expect(source).not.toMatch(/(?<!\$)\{PRODUCT_NAME\} y répond/);
  });

  // The answer is the band's only prose, so it takes the reading size and
  // the full ink. Set at the retired lede's softer grey it would read as a
  // caption under the headline rather than as its answer.
  // @req REQ-044
  it("sets the answer in the reading size and full ink", () => {
    const { container } = render(<HomeHero />);
    const styles = Array.from(container.querySelectorAll("style"))
      .map((style) => style.textContent)
      .join("\n");

    const rule = styles.match(/\.home-hero-answer\s*\{[^}]*\}/)?.[0];
    expect(rule).toMatch(/font-size:\s*var\(--afh-text-body\)/);
    expect(rule).toMatch(/color:\s*var\(--afh-text\)/);

    // A class, not `.home-hero-copy p`: a descendant selector outranks a
    // single class, so an element rule would override whatever the answer
    // sets for itself.
    expect(styles).not.toMatch(/\.home-hero-copy p\s*\{/);
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
      /\.home-hero-seam\s*\{[^}]*border-bottom:[^;]*var\(--afh-cat-ocre\)/
    );
  });

  // @req REQ-044 @req ETNI-822
  it("labels the hero section as an accessible landmark, matched by e2e/home-visual.spec.ts", () => {
    const { container } = render(<HomeHero />);
    const section = container.querySelector("section");

    expect(section).toHaveAttribute("aria-label", PRODUCT_NAME);
  });

  // Search and globe must fit by content on a phone; a viewport-height floor
  // is what pushed the globe below the first screen.
  // @req REQ-115 @req ETNI-1404
  it("lets content size the band rather than claiming a viewport height", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/home/HomeHero.tsx"),
      "utf8"
    );

    expect(source).not.toMatch(/\b(?:dvh|svh|vh)\b|min-h-screen/);
  });

  // @req REQ-115 @req ETNI-1404
  it("draws the globe at every width, never hiding it on a phone", () => {
    const { container } = render(<HomeHero />);
    const styles = Array.from(container.querySelectorAll("style"))
      .map((style) => style.textContent)
      .join("\n");

    expect(container.querySelector(".home-hero-globe")).not.toBeNull();
    expect(styles).not.toMatch(/\.home-hero-globe\s*\{[^}]*display:\s*none/);
  });

  // @req REQ-115 @req ETNI-1404
  it("retires the historical map from the interactive hero", () => {
    render(<HomeHero />);

    expect(screen.queryByTestId("home-hero-figure")).toBeNull();
    expect(screen.queryByText(/al-Idrisi/i)).toBeNull();
  });

  /**
   * Document order, not direct childhood: the band gained a row wrapper when
   * it gained its second column, and what the reader — or a screen reader
   * walking the band — must meet first is the argument, not the globe.
   * CSS may put the visual wherever the width allows; the source may not.
   */
  // @req REQ-115
  it("keeps the copy first in the band", () => {
    const { container } = render(<HomeHero />);
    const copy = container.querySelector(".home-hero-copy");
    const globe = container.querySelector(".home-hero-globe");

    expect(copy).not.toBeNull();
    expect(globe).not.toBeNull();
    expect(
      copy!.compareDocumentPosition(globe!) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  // @req REQ-115
  it("renders a drawn project image with its alt text and visible credit", () => {
    const image = HOME_HERO_IMAGES[0];

    render(<HomeHero visual={{ kind: "image", image }} />);

    expect(screen.getByRole("img", { name: image.alt })).toBeInTheDocument();
    expect(screen.getByText(image.credit)).toBeInTheDocument();
    expect(screen.queryByTestId("home-hero-globe")).not.toBeInTheDocument();
  });

  // @req REQ-115
  it("keeps the interactive globe as the default and as an explicit draw", () => {
    const defaultView = render(<HomeHero />);
    expect(screen.getByTestId("home-hero-globe")).toBeInTheDocument();
    defaultView.unmount();

    render(<HomeHero visual={{ kind: "globe" }} />);
    expect(screen.getByTestId("home-hero-globe")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
