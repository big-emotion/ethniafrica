import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FeaturedModule } from "@/components/home/FeaturedModule";
import { getAxisHubRoute } from "@/lib/hubs/axisRoutes";
import type { HubModule } from "@/lib/hubs/moduleAvailability";

const gameModule = {
  id: "mercator",
  name: "La taille qu'on vous a cachée",
  accessMode: "jouer",
  page: null,
  availability: "static",
  gameSlug: "mercator",
  available: true,
} as unknown as HubModule;

const readingModule = {
  ...gameModule,
  id: "migrations",
  name: "Les routes du peuplement",
  accessMode: "comprendre",
  // A module outside Jouer is addressed by its PageType, not by a slug —
  // getModuleHref resolves the two in that order.
  page: "migrations",
  gameSlug: undefined,
} as unknown as HubModule;

const preview = { kind: "globe" } as never;

/**
 * The slot used to sit inside the hero band with no heading of its own: a
 * reader met a globe and had to work out from its controls that it was a
 * game they could play. It is a section now, after the argument and the
 * sample, where the three axes used to be.
 */
describe("FeaturedModule — the module the home puts forward (REQ-113/REQ-115)", () => {
  // @req REQ-113
  it("says what the slot is before the module is touched", () => {
    render(<FeaturedModule heroModule={gameModule} heroPreview={preview} />);

    const heading = screen.getByTestId("home-featured-heading");
    expect(heading.tagName).toBe("H2");
    expect(screen.getByText("Le jeu du mois")).toBeInTheDocument();
  });

  // HERO_SLOT_KINDS admits three preview shapes and only the globe is filed
  // under Jouer. A hard-coded « jeu » would go false the first time the slot
  // opened on family-crown or migration-paths — the way Jouer's own card
  // once promised « 2 peuples face à face » long after the hub had grown
  // past one comparison module.
  // @req REQ-115
  it("calls a non-game module a module, reading the drawn module's axis", () => {
    render(<FeaturedModule heroModule={readingModule} heroPreview={preview} />);

    expect(screen.getByText("Le module du mois")).toBeInTheDocument();
    expect(screen.queryByText("Le jeu du mois")).toBeNull();
  });

  // @req REQ-115
  it("scopes the section to the drawn module's axis accent", () => {
    const { container } = render(
      <FeaturedModule heroModule={gameModule} heroPreview={preview} />
    );

    expect(container.querySelector(".home-featured")).toHaveClass(
      "afh-accent-perv"
    );
  });

  // A provenance chip over a fallback would name a module the reader is not
  // looking at.
  // @req REQ-115
  it("falls back to the unlabelled globe when nothing was drawn", async () => {
    const { container } = render(<FeaturedModule />);

    // happy-dom has no WebGL, so the capability gate settles on the
    // committed AfricaBasemap fallback — see HomeGlobeStage.test.tsx for
    // the WebGL-available branch.
    await waitFor(() =>
      expect(
        container.querySelector("path#africa-landmass")
      ).toBeInTheDocument()
    );
    expect(container.querySelector(".home-featured")).not.toHaveClass(
      "afh-accent-perv"
    );
  });

  // The section follows the reader's chosen surface: on parchment a dark
  // panel was a hole punched through the page.
  // @req REQ-115
  it("puts the module panel on the page surface rather than pinning it to night", () => {
    const { container } = render(<FeaturedModule />);
    const styles = Array.from(container.querySelectorAll("style"))
      .map((style) => style.textContent)
      .join("\n");

    expect(container.querySelector(".home-featured")).not.toHaveClass(
      "afh-on-night"
    );
    expect(container.querySelector(".home-globe-holder")).not.toHaveClass(
      "afh-on-night"
    );
    expect(styles).toMatch(
      /\.home-globe-holder\s*{[^}]*background:\s*var\(--afh-bg\)/
    );
    expect(styles).not.toMatch(/var\(--afh-night-ground\)/);
  });

  // The stage sized itself off the hero's viewport-height floor. That floor
  // did not come with it, and a min-height here would borrow the section's
  // own height and collapse the stage — the failure that took the Mercator
  // page down once already.
  // @req REQ-115
  it("declares no height floor of its own for the section or the stage", () => {
    const { container } = render(<FeaturedModule />);
    const styles = Array.from(container.querySelectorAll("style"))
      .map((style) => style.textContent)
      .join("\n");

    // Scoped to this component's own two rules: the stage below brings its
    // own stylesheet, and what it does with its own height is its business.
    expect(styles.match(/\.home-featured\s*{[^}]*}/)?.[0]).not.toMatch(
      /min-height/
    );
    expect(styles.match(/\.home-globe-holder\s*{[^}]*}/)?.[0]).not.toMatch(
      /min-height/
    );
  });

  /**
   * The section promises « à essayer maintenant » and used to offer nothing
   * to press: its only link was HeroProvenanceChip, whose job is to say
   * where the module lives — a breadcrumb standing in for a door. The
   * reader was back to working out from the globe's controls that this was
   * a game, which is the failure moving the slot out of the hero was meant
   * to end.
   */
  // @req REQ-115
  it("offers a button that starts the drawn module", () => {
    render(<FeaturedModule heroModule={gameModule} heroPreview={preview} />);

    const start = screen.getByTestId("home-featured-start");
    expect(start).toHaveAttribute(
      "href",
      `${getAxisHubRoute("fr", "jouer")}/mercator`
    );
    expect(start).toHaveTextContent("La taille qu'on vous a cachée");
  });

  // @req REQ-115
  it("says « ouvrir » rather than « jouer » for a module that is not a game", () => {
    render(<FeaturedModule heroModule={readingModule} heroPreview={preview} />);

    expect(screen.getByTestId("home-featured-start")).toHaveTextContent(
      /^Ouvrir/
    );
  });

  /**
   * The name is the whole point of the label — a truncated one names no
   * game. The provenance chip above ellipses on purpose to keep the globe
   * above the fold; the button must not inherit that.
   */
  // @req REQ-115
  it("never truncates the module name in the button", () => {
    render(<FeaturedModule heroModule={gameModule} heroPreview={preview} />);

    const start = screen.getByTestId("home-featured-start");
    expect(start.className).not.toContain("truncate");
    expect(start.className).not.toContain("whitespace-nowrap");
  });

  // Form C of the actions charter: the container is the affordance, so a
  // second one inside it would promise a departure a button does not make.
  // @req REQ-115
  it("carries no arrow inside the button", () => {
    render(<FeaturedModule heroModule={gameModule} heroPreview={preview} />);

    expect(screen.getByTestId("home-featured-start").textContent).not.toContain(
      "→"
    );
  });

  // @req REQ-115
  it("offers nothing to start when no module was drawn", () => {
    render(<FeaturedModule />);

    expect(screen.queryByTestId("home-featured-start")).toBeNull();
  });

  // The globe carries its own readout, which also tracks the morph. A
  // second static caption beside it said less and covered it.
  // @req REQ-115
  it("leaves the module to say what it is, rather than captioning it twice", () => {
    render(<FeaturedModule heroModule={gameModule} heroPreview={preview} />);

    expect(screen.queryByTestId("home-globe-caption")).not.toBeInTheDocument();
  });
});
