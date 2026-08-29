import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PageLoadingScreen } from "@/components/system/PageLoadingScreen";

vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({
    children,
    sectionName,
  }: {
    children: React.ReactNode;
    sectionName?: string;
  }) => (
    <div data-testid="page-layout" data-section={sectionName}>
      {children}
    </div>
  ),
}));

describe("PageLoadingScreen", () => {
  /**
   * The wait has to say what it is waiting for. A screen reader gets this
   * sentence and nothing else, so "Chargement" alone would leave its user
   * with less than the sighted reader reads off the surrounding page.
   */
  // @req REQ-104
  it("announces what the reader is waiting for", () => {
    render(<PageLoadingScreen label="Chargement du quiz" />);

    expect(screen.getByRole("status")).toHaveTextContent("Chargement du quiz");
  });

  /**
   * The shell is the arriving page's own layout, so React reconciles the two
   * trees and the header, search and footer are never unmounted mid-
   * navigation — otherwise the wait reads as a full page reload.
   */
  // @req REQ-098
  it("keeps the page shell up, carrying the section the header names", () => {
    render(<PageLoadingScreen label="Chargement" sectionName="Jouer" />);

    expect(screen.getByTestId("page-layout")).toHaveAttribute(
      "data-section",
      "Jouer"
    );
    expect(screen.getByTestId("page-loading-band")).toBeInTheDocument();
  });

  /**
   * The same coastline the basemap and the fiche wait draw. A spinner here
   * would be the one wait state on the site that belongs to no map.
   */
  // @req REQ-104
  it("draws the atlas coastline rather than a borrowed spinner", () => {
    const { container } = render(<PageLoadingScreen label="Chargement" />);

    expect(container.querySelector("svg.afh-atl-figure")).not.toBeNull();
  });

  /**
   * `--accent` carries two incompatible meanings in this codebase: shadcn's
   * bare HSL triplet in index.css, a hex on the .afh-accent-* wrappers in
   * color.css. Outside a wrapper the triplet wins, `fill: var(--accent)`
   * resolves to nothing, and the continent renders black — a defect no
   * assertion about markup can see, which is why this one is about scope.
   */
  // @req REQ-104
  it("inks the coastline inside an accent scope, never on the bare page", () => {
    const { container } = render(<PageLoadingScreen label="Chargement" />);

    expect(
      container.querySelector("[class*='afh-accent-'] svg.afh-atl-figure")
    ).not.toBeNull();
  });

  // @req REQ-113
  it("spends the wait on a fact rather than on a bare indicator", () => {
    render(<PageLoadingScreen label="Chargement" />);

    expect(screen.getByText("Saviez-vous que")).toBeInTheDocument();
  });
});
