import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { useIsMobile } from "@/hooks/use-mobile";

/**
 * `/fr/pays` is a list, and nothing else.
 *
 * It used to be a two-pane directory that opened a country in a detail pane of
 * its own — no globe, and the dossier folded behind a disclosure. That pane was
 * a second country surface competing with the atlas fiche, reached from the
 * main navigation while the fiche sat one URL away. These are the two things
 * that must not come back: a reading gate on the directory, and a rendering of
 * the fiche's dossier beside the list.
 *
 * The second case guards the other half of the same regression: the pane was
 * chosen by a JS-measured breakpoint, so the page rendered two different trees
 * and swapped between them on hydration.
 */

vi.mock("@/hooks/use-language", () => ({
  useLanguage: () => ({ language: "fr", setLanguage: vi.fn() }),
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: vi.fn(() => false),
}));

vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="page-layout">{children}</div>
  ),
}));

vi.mock("@/components/views/DirectoryHero", () => ({
  DirectoryHero: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="directory-hero">{children}</div>
  ),
}));

vi.mock("@/components/views/CountryView", () => ({
  CountryView: () => <div data-testid="country-list" />,
}));

import { PaysPageContentV2 } from "@/components/pages/PaysPageContentV2";

describe("country directory charter", () => {
  // @req REQ-091
  it("shows the list, with no reading gate and no dossier beside it", () => {
    const { container } = render(<PaysPageContentV2 />);

    expect(screen.getByTestId("country-list")).toBeInTheDocument();
    expect(container.querySelectorAll("details")).toHaveLength(0);
    expect(screen.queryByText(/Lire le dossier complet/i)).toBeNull();
    expect(screen.queryByText(/Sélectionnez un pays/i)).toBeNull();
  });

  // @req REQ-043
  it("renders one tree, not one per measured breakpoint", () => {
    vi.mocked(useIsMobile).mockReturnValue(true);
    const narrow = render(<PaysPageContentV2 />).container.innerHTML;

    vi.mocked(useIsMobile).mockReturnValue(false);
    const wide = render(<PaysPageContentV2 />).container.innerHTML;

    expect(narrow).toBe(wide);
  });
});
