import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen, waitFor, within } from "@testing-library/react";
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
    expect(styles).toMatch(/\.home-hero\s*{[^}]*background:\s*var\(--afh-bg\)/);
    expect(styles).not.toMatch(/var\(--afh-night-ground\)/);
  });

  // The one question a first-time visitor actually arrives with — what is
  // this site? — went unanswered above the fold while the band stopped
  // after the lede and handed them a globe.
  // @req REQ-044
  it("says what the atlas is, in two sentences, under the lede", () => {
    render(<HomeHero />);

    const standfirst = screen.getByTestId("home-hero-standfirst");
    const sentences = standfirst
      .textContent!.split(/(?<=\.)\s+/)
      .filter((part) => part.trim().length > 0);

    expect(sentences).toHaveLength(2);
    expect(standfirst).toHaveTextContent(/publie en accès libre/i);
    expect(standfirst).toHaveTextContent(
      /sa source et son niveau de confiance/i
    );
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

    expect(source).toMatch(/\$\{PRODUCT_NAME\} publie/);
    expect(source).not.toMatch(/(?<!\$)\{PRODUCT_NAME\} publie/);
  });

  // Three registers in descending order of voice. Set at the lede's size
  // and ink, the standfirst would merge with it into one four-line grey
  // block and the reader would skip both.
  // @req REQ-044
  it("sets the standfirst in the reading size and full ink, apart from the lede", () => {
    const { container } = render(<HomeHero />);
    const styles = Array.from(container.querySelectorAll("style"))
      .map((style) => style.textContent)
      .join("\n");

    const rule = styles.match(/\.home-hero-standfirst\s*{[^}]*}/)?.[0];
    expect(rule).toMatch(/font-size:\s*var\(--afh-text-body\)/);
    expect(rule).toMatch(/color:\s*var\(--afh-text\)/);

    // The lede keeps the softer ink, so the two never collapse into one
    // block. A `.home-hero-copy p` element rule would have outranked the
    // standfirst's own class and flattened both.
    expect(styles).toMatch(
      /\.home-hero-lede\s*{[^}]*color:\s*var\(--afh-text-soft\)/
    );
    expect(styles).not.toMatch(/\.home-hero-copy p\s*{/);
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

  // The viewport-height floor existed to keep the globe and its controls
  // inside the first screen. With the module gone to its own section, the
  // same rule would stretch three paragraphs over a full screen and push
  // the three entry points below the fold — the opposite of why they were
  // moved up here.
  /**
   * REVERSED, deliberately. This test used to forbid a viewport-height band,
   * and the reason it gave was sound at the time: three centred paragraphs
   * stretched over a full screen is air, and it pushed the three entry points
   * below the fold.
   *
   * What changed is the band, not the argument. It is now two columns — copy
   * beside a visual — so the height is filled by content rather than by
   * whitespace, and the home takes the same immersive band as the three axis
   * hubs (`heroVariant.ts`) rather than being the one entry point that opens
   * short.
   *
   * `svh`, never `vh` or `dvh`: on a phone `100vh` is the window measured with
   * the URL bar retracted, so a `100vh` band is always taller than the screen
   * it is on. The `min(…, 760px)` floor keeps a short, wide window from
   * stranding the copy in an empty field.
   */
  // @req REQ-115
  it("claims the viewport the way the other entry points do", () => {
    const { container } = render(<HomeHero />);
    const styles = Array.from(container.querySelectorAll("style"))
      .map((style) => style.textContent)
      .join("\n");

    expect(container.querySelector("section.home-hero")).not.toBeNull();
    expect(styles).toMatch(/min-height:\s*min\(100svh,\s*760px\)/);
    expect(styles).toMatch(/min-height:\s*100svh/);
    expect(styles).not.toMatch(/min-height:\s*calc\(100dvh/);
    expect(styles).not.toMatch(/min-height:\s*calc\(100vh/);
  });

  /**
   * The visual is the argument, not decoration. The repo's rule for home
   * imagery (public/images/home/CREDITS.md) is that each picture is a document
   * the block it sits in is *about* — a generic photograph of the continent
   * would substitute for none of them.
   *
   * Al-Idrisi drew this in 1154 for Roger II of Sicily, oriented south-up, and
   * he was born in Ceuta. A map of the world made from inside Africa, by
   * someone naming it from where he stood, is the headline restated in one
   * image: who named, from where, and when.
   */
  // @req REQ-115
  it("carries its visual with the credit its licence is published under", () => {
    render(<HomeHero />);

    const figure = screen.getByTestId("home-hero-figure");

    expect(within(figure).getByRole("img")).toHaveAttribute(
      "alt",
      expect.stringMatching(/.+/)
    );
    expect(figure).toHaveTextContent(/al-Idrisi/i);
    expect(figure).toHaveTextContent(/domaine public/i);
  });

  /**
   * Document order, not direct childhood: the band gained a row wrapper when
   * it gained its second column, and what the reader — or a screen reader
   * walking the band — must meet first is the argument, not the picture of it.
   * CSS may put the visual wherever the width allows; the source may not.
   */
  // @req REQ-115
  it("keeps the copy first in the band", () => {
    const { container } = render(<HomeHero />);
    const copy = container.querySelector(".home-hero-copy");
    const figure = screen.getByTestId("home-hero-figure");

    expect(copy).not.toBeNull();
    expect(
      copy!.compareDocumentPosition(figure) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });
});
