import type { ReactNode } from "react";

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({ children }: { children: ReactNode }) => (
    <div data-testid="page-layout">{children}</div>
  ),
}));

import { WallpaperLibraryPage } from "../WallpaperLibraryPage";
import { scaleLadder } from "@/lib/i18n/copy/scaleLadder";
import { WALLPAPER_FORMATS } from "@/lib/wallpaper/formats";

describe("WallpaperLibraryPage", () => {
  // @req REQ-132
  it("lists the six rungs in ladder order, oldest last", () => {
    render(<WallpaperLibraryPage language="fr" />);

    // Direct children only: each rung nests a list of its own, one item per
    // canvas, and those are not rungs.
    const rungs = Array.from(
      screen.getByTestId("scale-ladder").children
    ) as HTMLElement[];

    expect(rungs).toHaveLength(6);
    expect(rungs[0]).toHaveTextContent("140 ans");
    expect(rungs[5]).toHaveTextContent("300 000 ans");
    expect(rungs.map((rung) => rung.dataset.testid)).toEqual(
      scaleLadder.fr.rungs.map((rung) => `ladder-rung-${rung.id}`)
    );
  });

  /**
   * The image is the debt and the page is the payment. A magnitude offered as
   * a download with no dated anchor beside it would be a slogan leaving the
   * site, and on a sourced atlas a slogan is a lie about the corpus.
   */
  // @req REQ-132
  it("prints the dated anchor and its provenance beside every download", () => {
    render(<WallpaperLibraryPage language="fr" />);

    for (const rung of scaleLadder.fr.rungs) {
      const card = screen.getByTestId(`ladder-rung-${rung.id}`);

      expect(card).toHaveTextContent(rung.anchor);
      expect(card).toHaveTextContent(rung.provenance);
    }
  });

  // @req REQ-132
  it("badges the two rungs the corpus does not itself carry", () => {
    render(<WallpaperLibraryPage language="fr" />);

    expect(screen.getByTestId("ladder-provenance-border")).toHaveTextContent(
      "Hors corpus"
    );
    expect(screen.getByTestId("ladder-provenance-sapiens")).toHaveTextContent(
      "Hors corpus"
    );
    expect(screen.getByTestId("ladder-provenance-kongo")).toHaveTextContent(
      "Dans le corpus"
    );
  });

  // @req REQ-132
  it("offers every canvas for every rung, as a named download", () => {
    render(<WallpaperLibraryPage language="fr" />);

    const card = screen.getByTestId("ladder-rung-kongo");
    const links = within(card).getAllByRole("link");

    expect(links).toHaveLength(WALLPAPER_FORMATS.length);
    for (const format of WALLPAPER_FORMATS) {
      const link = links.find((anchor) =>
        anchor.getAttribute("href")?.includes(`format=${format.id}`)
      );
      expect(link).toBeDefined();
      expect(link).toHaveAttribute(
        "href",
        `/api/og/ladder?rung=kongo&format=${format.id}&lang=fr`
      );
      expect(link).toHaveAttribute("download");
    }
  });

  // @req REQ-132
  it("closes on the sentence the ladder exists to make unavoidable", () => {
    render(<WallpaperLibraryPage language="fr" />);

    expect(screen.getByTestId("ladder-reframe")).toHaveTextContent(
      scaleLadder.fr.reframe
    );
  });

  // @req REQ-145
  it("renders the library in English, pointing at the English images", () => {
    render(<WallpaperLibraryPage language="en" />);

    expect(screen.getByTestId("ladder-rung-kemet")).toHaveTextContent(
      "The Egyptian Old Kingdom"
    );
    expect(screen.getByTestId("ladder-provenance-sapiens")).toHaveTextContent(
      "Outside the corpus"
    );
    expect(
      within(screen.getByTestId("ladder-rung-kongo")).getAllByRole("link")[0]
    ).toHaveAttribute("href", expect.stringContaining("lang=en"));
  });
});
