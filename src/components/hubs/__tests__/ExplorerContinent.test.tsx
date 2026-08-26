import { render, screen, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ExplorerContinent } from "@/components/hubs/ExplorerContinent";

// The stand-in exercises the targetFacts seam the way AtlasGlobe does —
// calling it for a chosen target — so the panel's contents are asserted
// through the same path the real globe uses.
vi.mock("@/components/atlas/AtlasGlobe", () => ({
  AtlasGlobe: ({
    targetFacts,
  }: {
    targetFacts?: (target: { countryId: string; nameFr: string }) => {
      title: string;
      description?: string;
      body?: React.ReactNode;
    };
  }) => {
    const facts = targetFacts?.({ countryId: "TZA", nameFr: "Tanzanie" });
    return (
      <div data-testid="atlas-globe">
        <span data-testid="facts-title">{facts?.title}</span>
        <span data-testid="facts-description">{facts?.description}</span>
        {facts?.body}
      </div>
    );
  },
}));

// A hand-driven observer: the globe's mount is exactly what we want to
// control here, and a real one never intersects in a headless DOM.
let triggerIntersection: (() => void) | null = null;

class StubIntersectionObserver {
  constructor(callback: IntersectionObserverCallback) {
    triggerIntersection = () =>
      callback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        this as unknown as IntersectionObserver
      );
  }
  observe() {}
  disconnect() {}
  unobserve() {}
}

const COUNTS = { TZA: 99, NGA: 68 };

beforeEach(() => {
  triggerIntersection = null;
  vi.stubGlobal("IntersectionObserver", StubIntersectionObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ExplorerContinent — the map scene (REQ-116)", () => {
  // The GL context and its texture are built at mount, so below the fold
  // on a phone that cost should never be paid at all.
  // @req REQ-116
  it("holds the globe unmounted until the scene is scrolled into view", () => {
    render(
      <ExplorerContinent
        peopleCountsByCountry={COUNTS}
        missingMessage="rien à afficher"
      />
    );

    expect(screen.getByTestId("explorer-continent")).toHaveAttribute(
      "data-globe-mounted",
      "false"
    );
    expect(screen.queryByTestId("atlas-globe")).not.toBeInTheDocument();
  });

  // @req REQ-116
  it("mounts the globe once the scene intersects", async () => {
    render(
      <ExplorerContinent
        peopleCountsByCountry={COUNTS}
        missingMessage="rien à afficher"
      />
    );

    act(() => triggerIntersection?.());

    // next/dynamic resolves its chunk asynchronously, so the globe arrives
    // a tick after the gate opens.
    expect(await screen.findByTestId("atlas-globe")).toBeInTheDocument();
  });

  // The trace is already in the bundle, so the hub can read cartographic
  // from the very first paint without waiting on anything.
  // @req REQ-116
  it("paints a decorative basemap while the globe is still held back", () => {
    render(
      <ExplorerContinent
        peopleCountsByCountry={COUNTS}
        missingMessage="rien à afficher"
      />
    );

    const placeholder = screen.getByTestId("explorer-continent-placeholder");
    expect(placeholder).toHaveAttribute("aria-hidden", "true");
  });

  // The marker opens the panel and the panel carries the link, so a
  // mis-hit on a 22px target costs a dismissal, not a navigation and a
  // back-trip (REQ-117).
  // @req REQ-117
  it("puts the fiche link in the panel, keyed to the chosen country", async () => {
    render(
      <ExplorerContinent
        peopleCountsByCountry={COUNTS}
        missingMessage="rien à afficher"
      />
    );

    act(() => triggerIntersection?.());
    await screen.findByTestId("atlas-globe");

    expect(screen.getByTestId("explorer-continent-fiche-link")).toHaveAttribute(
      "href",
      "/fr/pays/TZA"
    );
  });

  // The title doubles as the marker's accessible name, so a count there
  // would give every marker a stray number.
  // @req REQ-117
  it("keeps the count out of the marker name and in the description", async () => {
    render(
      <ExplorerContinent
        peopleCountsByCountry={COUNTS}
        missingMessage="rien à afficher"
      />
    );

    act(() => triggerIntersection?.());
    await screen.findByTestId("atlas-globe");

    expect(screen.getByTestId("facts-title")).toHaveTextContent("Tanzanie");
    expect(screen.getByTestId("facts-title")).not.toHaveTextContent(/\d/);
    expect(screen.getByTestId("facts-description")).toHaveTextContent(
      "peuples documentés"
    );
  });

  // @req REQ-116
  it("reserves the stage height so mounting the globe shifts nothing", () => {
    render(
      <ExplorerContinent
        peopleCountsByCountry={COUNTS}
        missingMessage="rien à afficher"
      />
    );

    expect(screen.getByTestId("explorer-continent").style.aspectRatio).toBe(
      "800 / 758"
    );
  });
});
