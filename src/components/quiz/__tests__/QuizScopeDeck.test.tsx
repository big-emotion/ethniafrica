import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { QuizScopeDeck } from "@/components/quiz/QuizScopeDeck";
import { isPageReplacingNavigation } from "@/components/system/routeTransitionTiming";
import { getLocalizedRoute } from "@/lib/routing";

const QUIZ = getLocalizedRoute("fr", "quiz");

const THEMES = [
  { id: "noms", labelFr: "Noms et appellations" },
  { id: "croyances", labelFr: "Croyances" },
  { id: "migrations", labelFr: "Migrations" },
];

function deck(
  items = [
    { id: "GHA", labelFr: "Ghana", playableThemeIds: ["noms", "croyances"] },
    { id: "KEN", labelFr: "Kenya", playableThemeIds: ["noms"] },
  ]
) {
  return (
    <QuizScopeDeck
      items={items}
      themes={THEMES}
      action={QUIZ}
      panelHintFr="Choisissez un sujet, ou jouez le pays entier."
      wholeTrackLabelFr="Jouer sans thème"
      closeLabelFr="Fermer"
    />
  );
}

describe("QuizScopeDeck", () => {
  /**
   * The server-rendered contract. This component is a plain client component
   * rather than `dynamic({ ssr: false })` precisely so a reader with no
   * JavaScript still gets every country as a real link — `ssr: false` renders
   * nothing on the server, children included.
   */
  // @req REQ-121
  it("renders every country as a link before any interaction", () => {
    render(deck());

    expect(screen.getByRole("link", { name: "Ghana" })).toHaveAttribute(
      "href",
      `${QUIZ}?pays=GHA`
    );
    expect(screen.getByRole("link", { name: "Kenya" })).toHaveAttribute(
      "href",
      `${QUIZ}?pays=KEN`
    );
  });

  /**
   * Presence, not greying. 123 of the 486 country × theme pairs cannot fill a
   * session; the panel answers by not offering them, which is the same
   * discipline a round generator follows when it returns null rather than
   * inventing an option.
   */
  // @req REQ-121
  it("deploys only the themes the country can fill", () => {
    render(deck());

    fireEvent.click(screen.getByRole("link", { name: "Ghana" }));

    expect(screen.getByRole("link", { name: "Croyances" })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Migrations" })
    ).not.toBeInTheDocument();
    // Nothing announces the absence: no count, no « trop peu de questions ».
    expect(document.body.textContent).not.toMatch(/Migrations/);
  });

  // @req REQ-121
  it("sends a chip to the crossed track", () => {
    render(deck());

    fireEvent.click(screen.getByRole("link", { name: "Ghana" }));

    expect(screen.getByRole("link", { name: "Croyances" })).toHaveAttribute(
      "href",
      `${QUIZ}?pays=GHA&theme=croyances`
    );
  });

  // @req REQ-121
  it("keeps the whole-country track reachable from the open panel", () => {
    render(deck());

    fireEvent.click(screen.getByRole("link", { name: "Ghana" }));

    expect(
      screen.getByRole("link", { name: "Jouer sans thème" })
    ).toHaveAttribute("href", `${QUIZ}?pays=GHA`);
  });

  // @req REQ-121
  it("opens one country at a time", () => {
    render(deck());

    fireEvent.click(screen.getByRole("link", { name: "Ghana" }));
    expect(screen.getByRole("link", { name: "Ghana" })).toHaveAttribute(
      "aria-expanded",
      "true"
    );

    fireEvent.click(screen.getByRole("link", { name: "Kenya" }));

    expect(screen.getByRole("link", { name: "Ghana" })).toHaveAttribute(
      "aria-expanded",
      "false"
    );
    expect(screen.getByRole("link", { name: "Kenya" })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
  });

  // @req REQ-121
  it("closes on Escape and returns focus to the country", () => {
    render(deck());
    const card = screen.getByRole("link", { name: "Ghana" });

    fireEvent.click(card);
    fireEvent.keyDown(document, { key: "Escape" });

    expect(card).toHaveAttribute("aria-expanded", "false");
    expect(card).toHaveFocus();
  });

  // @req REQ-121
  it("announces the panel it controls", () => {
    render(deck());
    const card = screen.getByRole("link", { name: "Ghana" });

    fireEvent.click(card);

    const panelId = card.getAttribute("aria-controls");
    expect(panelId).toBeTruthy();
    const panel = document.getElementById(panelId as string);
    expect(panel).not.toBeNull();
    expect(panel).toHaveAttribute("aria-labelledby", card.id);
  });

  /**
   * A country with nothing to deploy stays a plain link. This is also what a
   * reader with no JavaScript gets from every card, and what the closed state
   * of the others is.
   */
  // @req REQ-121
  it("navigates rather than deploys when a country offers no theme", () => {
    render(deck([{ id: "DJI", labelFr: "Djibouti", playableThemeIds: [] }]));
    const card = screen.getByRole("link", { name: "Djibouti" });

    expect(card).not.toHaveAttribute("aria-expanded");

    fireEvent.click(card);

    expect(screen.queryByText("Jouer sans thème")).not.toBeInTheDocument();
  });

  /**
   * A card that cancels its own click must not leave the route overlay waiting
   * for a navigation that never comes — the bug that shipped on the home's axis
   * cards, where the interstitial covered the screen for its full 15 s escape
   * hatch. Next's `Link` cancels the native navigation on *every* internal
   * click, so `defaultPrevented` cannot separate the two cases.
   *
   * Two things keep the overlay down here, and only one of them is this
   * component's doing:
   *
   *  - A track is a query on the picker's own path, and the overlay already
   *    treats a query-only change as staying put. That is what actually holds
   *    today, and it is what a reader gets.
   *  - `data-opens-in-place` is the declaration, and it is what still holds
   *    when a card's href stops sharing the picker's pathname — which is what
   *    the globe lot does. Asserted from a differing path, so the attribute is
   *    the only thing deciding and the assertion cannot pass for the first
   *    reason instead.
   */
  // @req REQ-103
  it("keeps the route overlay down when a card opens in place", () => {
    render(deck());
    const card = screen.getByRole("link", {
      name: "Ghana",
    }) as HTMLAnchorElement;
    const intent = (currentUrl: string) =>
      isPageReplacingNavigation({
        anchor: card,
        currentUrl,
        button: 0,
        hasModifier: false,
        defaultPrevented: false,
      });

    expect(intent(`https://ethniafrica.test${QUIZ}`)).toBe(false);

    expect(card).toHaveAttribute("data-opens-in-place", "true");
    expect(intent("https://ethniafrica.test/fr")).toBe(false);

    // Live, not merely green: without the attribute that same click reads as a
    // departure and would raise the overlay.
    card.removeAttribute("data-opens-in-place");
    expect(intent("https://ethniafrica.test/fr")).toBe(true);
  });

  /** A card that only navigates must not claim to open in place. */
  // @req REQ-103
  it("does not claim to open in place when it actually navigates", () => {
    render(deck([{ id: "DJI", labelFr: "Djibouti", playableThemeIds: [] }]));

    expect(screen.getByRole("link", { name: "Djibouti" })).not.toHaveAttribute(
      "data-opens-in-place"
    );
  });
});
