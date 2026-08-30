// @req REQ-019
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PinnedVersionBanner } from "../PinnedVersionBanner";
import { getPeopleRoute } from "@/lib/routing";

const LIVE_URL = getPeopleRoute("fr", "yoruba");
const OTHER_LIVE_URL = getPeopleRoute("fr", "bambara");
const storageKey = (liveUrl: string) =>
  `pinned-version-banner:collapsed:${liveUrl}`;

describe("PinnedVersionBanner", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  // @req REQ-019
  it("renders the exact French copy, normalized version tag, and live link", () => {
    render(
      <PinnedVersionBanner
        pinnedAt="2025-09-21T18:30:00.000Z"
        versionTag="v34"
        liveUrl={LIVE_URL}
      />
    );

    const region = screen.getByRole("region", {
      name: "indicateur de version figée",
    });
    expect(region).toHaveAttribute("data-pinned-banner");
    expect(region).toHaveTextContent(
      "Version figée du 21 septembre 2025 (@v34) · voir la version vivante"
    );
    expect(
      screen.getByRole("link", { name: "voir la version vivante" })
    ).toHaveAttribute("href", LIVE_URL);
  });

  // @req REQ-019
  it("does not duplicate the at-sign when versionTag is already normalized", () => {
    render(
      <PinnedVersionBanner
        pinnedAt="2025-09-21"
        versionTag="@v34"
        liveUrl={LIVE_URL}
      />
    );

    expect(screen.getByRole("region")).toHaveTextContent("(@v34)");
    expect(screen.getByRole("region")).not.toHaveTextContent("@@v34");
  });

  // @req REQ-019
  it.each([null, "not-a-date"])(
    "degrades safely without inventing a date when pinnedAt is %s",
    (pinnedAt) => {
      render(
        <PinnedVersionBanner
          pinnedAt={pinnedAt}
          versionTag="v34"
          liveUrl={LIVE_URL}
        />
      );

      const region = screen.getByRole("region");
      expect(region).toHaveTextContent(
        "Version figée (@v34) · voir la version vivante"
      );
      expect(region).not.toHaveTextContent("Invalid Date");
    }
  );

  // @req REQ-019
  it("uses the warm and calm design tokens", () => {
    render(
      <PinnedVersionBanner
        pinnedAt="2025-09-21"
        versionTag="v34"
        liveUrl={LIVE_URL}
      />
    );

    expect(screen.getByRole("region")).toHaveClass(
      "bg-afh-bg-warm",
      "border-afh-border",
      "text-afh-text"
    );
  });

  // @req REQ-019
  it("collapses to a compact version indicator while keeping the live link visible", () => {
    render(
      <PinnedVersionBanner
        pinnedAt="2025-09-21"
        versionTag="v34"
        liveUrl={LIVE_URL}
      />
    );

    const collapseControl = screen.getByRole("button", {
      name: "réduire l’indicateur de version figée",
    });
    expect(collapseControl).toHaveClass("min-h-[44px]", "min-w-[44px]");

    fireEvent.click(collapseControl);

    expect(
      screen.getByText("@v34", { selector: "[data-version-indicator]" })
    ).toBeInTheDocument();
    expect(screen.getByRole("region")).toHaveClass(
      "ml-auto",
      "w-fit",
      "max-w-full"
    );
    expect(
      screen.getByRole("link", { name: "voir la version vivante" })
    ).toBeVisible();
    expect(
      screen.getByRole("button", {
        name: "développer l’indicateur de version figée",
      })
    ).toHaveAttribute("aria-expanded", "false");
    expect(window.localStorage.getItem(storageKey(LIVE_URL))).toBe("1");
  });

  // @req REQ-019
  it("restores the persisted collapsed state after the hydration-safe initial render", async () => {
    window.localStorage.setItem(storageKey(LIVE_URL), "1");

    render(
      <PinnedVersionBanner
        pinnedAt="2025-09-21"
        versionTag="v34"
        liveUrl={LIVE_URL}
      />
    );

    expect(
      await screen.findByRole("button", {
        name: "développer l’indicateur de version figée",
      })
    ).toBeInTheDocument();
    expect(screen.getByRole("region")).not.toHaveTextContent(
      "Version figée du"
    );
    expect(screen.getByRole("link")).toBeVisible();
  });

  // @req REQ-019
  it("scopes persistence to liveUrl and re-reads it when liveUrl changes", async () => {
    window.localStorage.setItem(storageKey(OTHER_LIVE_URL), "1");
    const { rerender } = render(
      <PinnedVersionBanner
        pinnedAt="2025-09-21"
        versionTag="v34"
        liveUrl={LIVE_URL}
      />
    );

    expect(
      screen.getByRole("button", {
        name: "réduire l’indicateur de version figée",
      })
    ).toBeInTheDocument();

    rerender(
      <PinnedVersionBanner
        pinnedAt="2025-09-21"
        versionTag="v35"
        liveUrl={OTHER_LIVE_URL}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: "développer l’indicateur de version figée",
        })
      ).toBeInTheDocument();
    });
    expect(screen.getByRole("link")).toHaveAttribute("href", OTHER_LIVE_URL);
  });

  // @req REQ-019
  it("continues to work when localStorage is unavailable", () => {
    vi.spyOn(window.localStorage, "getItem").mockImplementation(() => {
      throw new Error("Storage unavailable");
    });
    vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
      throw new Error("Storage unavailable");
    });

    expect(() =>
      render(
        <PinnedVersionBanner
          pinnedAt="2025-09-21"
          versionTag="v34"
          liveUrl={LIVE_URL}
        />
      )
    ).not.toThrow();

    fireEvent.click(
      screen.getByRole("button", {
        name: "réduire l’indicateur de version figée",
      })
    );
    expect(
      screen.getByRole("button", {
        name: "développer l’indicateur de version figée",
      })
    ).toBeInTheDocument();
  });

  // @req REQ-019
  it.each([
    [1, "Depuis cette version figée, 1 assertion a été corrigée"],
    [2, "Depuis cette version figée, 2 assertions ont été corrigées"],
  ])("renders the resolved flag note for count %i", (count, expectedCopy) => {
    render(
      <PinnedVersionBanner
        pinnedAt="2025-09-21"
        versionTag="v34"
        liveUrl={LIVE_URL}
        resolvedFlagsCount={count}
      />
    );

    expect(screen.getByRole("region")).toHaveTextContent(expectedCopy);
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByRole("link")).toHaveTextContent("voir version vivante");
  });

  // @req REQ-019
  it("does not render a resolved flag note for a non-positive count", () => {
    render(
      <PinnedVersionBanner
        pinnedAt="2025-09-21"
        versionTag="v34"
        liveUrl={LIVE_URL}
        resolvedFlagsCount={0}
      />
    );

    expect(screen.getByRole("region")).not.toHaveTextContent(
      "Depuis cette version figée"
    );
  });
});
