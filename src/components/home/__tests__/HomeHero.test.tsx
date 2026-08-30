import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HomeHero } from "@/components/home/HomeHero";
import { PRODUCT_NAME } from "@/lib/brand";

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

  // The band is copy now: the module that used to fill it stands lower on
  // the page, under a heading of its own (FeaturedModule). A globe left
  // here would be the second one on the route.
  // @req REQ-115
  it("hands the module slot to its own section rather than holding it", () => {
    const { container } = render(<HomeHero />);

    expect(container.querySelector(".home-globe-holder")).toBeNull();
    expect(container.querySelector(".home-globe-stage")).toBeNull();
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

  // The viewport-height floor existed to keep the globe and its controls
  // inside the first screen. With the module gone to its own section, the
  // same rule would stretch the copy over a full screen and push the
  // argument below the fold — the opposite of why it was moved up.
  // @req REQ-115
  it("sizes to its copy instead of claiming a full viewport at desktop", () => {
    const { container } = render(<HomeHero />);
    const styles = Array.from(container.querySelectorAll("style"))
      .map((style) => style.textContent)
      .join("\n");

    expect(container.querySelector("section.home-hero")).not.toBeNull();
    expect(styles).not.toMatch(/min-height:\s*calc\(100dvh/);
    expect(styles).not.toMatch(/min-height:\s*calc\(100vh/);
  });

  // @req REQ-115
  it("keeps the copy first in the band", () => {
    const { container } = render(<HomeHero />);
    const copy = container.querySelector(".home-hero-copy");

    expect(copy).not.toBeNull();
    expect(container.querySelector("section")?.firstElementChild).toBe(copy);
  });
});
