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
    renderInShell(
      <FicheLoadingScreen entityType="people" sectionName="Peuples" />
    );

    expect(screen.getByTestId("site-header")).toBeInTheDocument();
  });

  // @req REQ-104
  it("names what is being loaded rather than reporting a bare wait", () => {
    renderInShell(
      <FicheLoadingScreen entityType="country" sectionName="Pays" />
    );

    expect(screen.getByRole("status")).toHaveTextContent(/fiche pays/i);
  });

  // @req REQ-104
  it("reserves the globe band's own height, so the fiche does not jump when it lands", () => {
    const { container } = renderInShell(
      <FicheLoadingScreen entityType="people" sectionName="Peuples" />
    );

    const band = container.querySelector("[data-testid='fiche-loading-band']");
    expect(band).not.toBeNull();
    expect((band as HTMLElement).style.minHeight).toBe(
      "var(--afh-globe-stage-height)"
    );
  });

  // @req REQ-104
  it("waits in the accent the arriving fiche will use, taken from the fiche's own map", () => {
    const { container } = renderInShell(
      <FicheLoadingScreen entityType="language-family" sectionName="Familles" />
    );

    const scope = container.querySelector(
      `.${ACCENT_CLASS_BY_ENTITY["language-family"]}`
    );

    expect(scope).not.toBeNull();
    // --accent carries two incompatible meanings in this codebase: shadcn's
    // bare HSL triplet in index.css, a hex on the .afh-accent-* wrappers in
    // color.css. On one shared element the triplet wins and every accent
    // colour resolves to nothing — a black continent on the night ground.
    expect(scope).not.toHaveClass("afh-on-night");
  });
});
