import type { ReactNode } from "react";

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({ children }: { children: ReactNode }) => (
    <div data-testid="page-layout">{children}</div>
  ),
}));

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));

import { WallpaperLibraryPage } from "../WallpaperLibraryPage";
import { scaleLadder } from "@/lib/i18n/copy/scaleLadder";

describe("WallpaperLibraryPage", () => {
  // @req REQ-132
  it("lists the six rungs in ladder order, oldest last", () => {
    render(<WallpaperLibraryPage language="fr" />);

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
   * The image is the page, not a caption over a blank ground. Every rung
   * carries its own picture, and the picture is what a visitor came to take.
   */
  // @req REQ-132
  it("gives every rung its own image, described for a reader who cannot see it", () => {
    render(<WallpaperLibraryPage language="fr" />);

    for (const rung of scaleLadder.fr.rungs) {
      const image = within(
        screen.getByTestId(`ladder-rung-${rung.id}`)
      ).getByRole("img");

      expect(image).toHaveAttribute(
        "src",
        `/images/wallpapers/${rung.id}-phone.jpg`
      );
      expect(image.getAttribute("alt")).toContain(rung.subject);
    }
  });

  /**
   * A wallpaper leaves the site and is re-shared. A magnitude offered with no
   * dated anchor beside it would be a slogan leaving the site, and on a
   * sourced atlas a slogan is a lie about what the atlas holds.
   */
  // @req REQ-132
  it("prints the dated anchor and where to check it beside every image", () => {
    render(<WallpaperLibraryPage language="fr" />);

    for (const rung of scaleLadder.fr.rungs) {
      const band = screen.getByTestId(`ladder-rung-${rung.id}`);

      expect(band).toHaveTextContent(rung.anchor);
      expect(band).toHaveTextContent(rung.provenance);
    }
  });

  // @req REQ-132
  it("badges the two rungs the atlas does not itself carry", () => {
    render(<WallpaperLibraryPage language="fr" />);

    expect(screen.getByTestId("ladder-provenance-border")).toHaveTextContent(
      "Hors de l’atlas"
    );
    expect(screen.getByTestId("ladder-provenance-sapiens")).toHaveTextContent(
      "Hors de l’atlas"
    );
    expect(screen.getByTestId("ladder-provenance-kongo")).toHaveTextContent(
      "Dans l’atlas"
    );
  });

  /**
   * One download per rung, straight at the file. The six format buttons the
   * first version offered read as a download table and buried the picture.
   */
  // @req REQ-132
  it("offers one named download per rung, pointing at the phone image", () => {
    render(<WallpaperLibraryPage language="fr" />);

    const band = screen.getByTestId("ladder-rung-kongo");
    const links = within(band).getAllByRole("link");

    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute(
      "href",
      "/images/wallpapers/kongo-phone.jpg"
    );
    expect(links[0]).toHaveAttribute("download");
    expect(links[0].getAttribute("aria-label")).toContain("royaume Kongo");
  });

  // @req REQ-132
  it("names the page in its h1 and leaves the argument to the images", () => {
    render(<WallpaperLibraryPage language="fr" />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Fonds d’écran" })
    ).toBeInTheDocument();
    expect(screen.getByTestId("scale-ladder")).toHaveAttribute(
      "aria-label",
      scaleLadder.fr.title
    );
  });

  // @req REQ-132
  it("closes on the sentence the ladder exists to make unavoidable", () => {
    render(<WallpaperLibraryPage language="fr" />);

    expect(screen.getByTestId("ladder-reframe")).toHaveTextContent(
      scaleLadder.fr.reframe
    );
  });

  /**
   * The same rule the About page now obeys: "fiche" and "corpus" are words
   * the workshop uses to itself, and a visitor knows neither.
   */
  // @req REQ-132
  // @req REQ-145
  it("says nothing to the reader in the workshop's own vocabulary", () => {
    for (const language of ["fr", "en"] as const) {
      const { container, unmount } = render(
        <WallpaperLibraryPage language={language} />
      );

      expect(container.textContent).not.toMatch(/fiches?\b/i);
      expect(container.textContent).not.toMatch(/corpus/i);

      unmount();
    }
  });

  // @req REQ-145
  it("renders the library in English", () => {
    render(<WallpaperLibraryPage language="en" />);

    expect(screen.getByTestId("ladder-rung-kemet")).toHaveTextContent(
      "Ancient Egypt"
    );
    expect(screen.getByTestId("ladder-provenance-sapiens")).toHaveTextContent(
      "Outside the atlas"
    );
  });
});
