import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CountryHubGlobe } from "@/components/hubs/CountryHubGlobe";
import { getCountryRoute } from "@/lib/routing";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/components/atlas/AtlasGlobeCanvas", () => ({
  AtlasGlobeCanvas: () => <canvas data-testid="atlas-globe-canvas-mock" />,
}));

/**
 * `/fr/pays` was an A-Z list of cards: the one entry point to the countries
 * that showed no map at all, while every country fiche opened on a globe. The
 * hub is the same object as the fiches now — a globe you aim — and its job is
 * to be a way in, so choosing a country goes there rather than opening a panel
 * about it.
 *
 * The choice is a list rather than pastilles on purpose. Fifty-four markers at
 * 430 px overlap into noise and the small countries stop being hittable, which
 * is the same reason the family footprint asks for a list.
 */
describe("CountryHubGlobe", () => {
  beforeEach(() => {
    push.mockClear();
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("prefers-reduced-motion"),
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  function renderHub() {
    return render(
      <CountryHubGlobe
        countryIds={["ZAF", "KEN", "DZA"]}
        peopleCountsByCountry={{ ZAF: 5, KEN: 12 }}
        missingMessage="Le corpus ne renseigne encore aucun pays."
      />
    );
  }

  const openPicker = () =>
    fireEvent.click(screen.getByRole("button", { name: /pays de l'atlas/i }));

  // @req REQ-116
  it("opens on a map rather than on a list of cards", () => {
    const { container } = renderHub();

    expect(container.querySelector("[data-atlas-stage]")).toBeInTheDocument();
  });

  // @req REQ-117
  it("offers every country of the corpus, under the name people use", () => {
    renderHub();
    openPicker();

    expect(
      screen.getByRole("option", { name: /Afrique du Sud/ })
    ).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Algérie/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Kenya/ })).toBeInTheDocument();
  });

  // @req REQ-116
  it("takes the reader to the country's fiche, which is where its globe is", () => {
    renderHub();
    openPicker();
    fireEvent.click(screen.getByRole("option", { name: /Kenya/ }));

    expect(push).toHaveBeenCalledWith(getCountryRoute("fr", "KEN"));
  });

  // Fifty-four pastilles is the noise the list exists to avoid.
  // @req REQ-117
  it("pins no pastille on the countries it offers", () => {
    const { container } = renderHub();

    expect(container.querySelector("[data-atlas-target]")).toBeNull();
  });
});
