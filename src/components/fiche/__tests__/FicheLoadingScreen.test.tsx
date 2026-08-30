import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { FicheLoadingScreen } from "@/components/fiche/FicheLoadingScreen";
import { ACCENT_CLASS_BY_ENTITY } from "@/components/fiche/FicheSequence";
import { ConsentProvider } from "@/hooks/use-consent";
import { getPeopleRoute } from "@/lib/routing";

/**
 * PageLayout is rendered for real rather than mocked, because the claim under
 * test is precisely that the loading surface carries the site's own shell.
 * Its footer reads the consent context, which the app supplies from
 * providers.tsx, so the test has to supply it too.
 */
const renderInShell = (ui: ReactElement) =>
  render(<ConsentProvider>{ui}</ConsentProvider>);

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => getPeopleRoute("fr", "PPL_BAGANDA"),
  useSearchParams: () => new URLSearchParams(),
}));

describe("FicheLoadingScreen (REQ-104 — what a fiche shows while it is being fetched)", () => {
  // @req REQ-098
  it("keeps the site header on screen, so orientation survives the navigation", () => {
    renderInShell(<FicheLoadingScreen entityType="people" />);

    expect(screen.getByTestId("site-header")).toBeInTheDocument();
  });

  // @req REQ-104
  it("names what is being loaded rather than reporting a bare wait", () => {
    renderInShell(<FicheLoadingScreen entityType="country" />);

    expect(screen.getByRole("status")).toHaveTextContent(/fiche pays/i);
  });

  /**
   * The wait used to open on the fiche's own night band, sized to
   * `--afh-globe-stage-height`, under a plate naming the section. The two
   * together filled the viewport, so the fact — the whole content of the wait
   * — sat below the fold and was never read on the routes that wait longest.
   */
  // @req REQ-113
  it("puts the fact on the fold, with no band above it to push it off", () => {
    const { container } = renderInShell(
      <FicheLoadingScreen entityType="people" />
    );

    expect(
      container.querySelector("[data-testid='fiche-hero-band']")
    ).toBeNull();
    expect(screen.getByTestId("did-you-know-loader")).toBeInTheDocument();
  });

  /**
   * Nothing on the wait names a page the reader has not arrived at: the plate
   * would say "Pays" where the fiche will say "Afrique du Sud", and the trail
   * would name a destination rather than a location.
   */
  // @req REQ-113
  it("names no page it has not arrived at", () => {
    renderInShell(<FicheLoadingScreen entityType="country" />);

    expect(screen.queryByTestId("page-hero")).toBeNull();
    expect(
      screen.queryByRole("navigation", { name: "Fil d'ariane" })
    ).toBeNull();
  });

  // @req REQ-104
  it("waits in the accent the arriving fiche will use, taken from the fiche's own map", () => {
    const { container } = renderInShell(
      <FicheLoadingScreen entityType="language-family" />
    );

    // --accent carries two incompatible meanings in this codebase: shadcn's
    // bare HSL triplet in index.css, a hex on the .afh-accent-* wrappers in
    // color.css. Outside a wrapper the triplet wins, `fill: var(--accent)`
    // resolves to nothing, and the continent paints black — which is why the
    // claim is about the figure's scope rather than about the class existing.
    expect(
      container.querySelector(
        `.${ACCENT_CLASS_BY_ENTITY["language-family"]} svg.afh-atl-figure`
      )
    ).not.toBeNull();
  });
});
