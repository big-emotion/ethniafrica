import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  FicheLoadingScreen,
  type FicheLoadingScreenProps,
} from "@/components/fiche/FicheLoadingScreen";
import { ACCENT_CLASS_BY_ENTITY } from "@/components/fiche/FicheSequence";
import { ConsentProvider } from "@/hooks/use-consent";
import { LOCALE_HEADER } from "@/lib/locale";
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

// A `loading.tsx` receives no params, so the screen reads the locale the
// middleware stamped on the request. Mutable per case; absent by default,
// which is what a request outside the locale tree looks like.
const requestHeaders = vi.hoisted(() => new Map<string, string>());

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => ({
    get: (name: string) => requestHeaders.get(name) ?? null,
  })),
}));

// The screen is an async server component now, so it is awaited like one.
const loadingScreen = async (props: FicheLoadingScreenProps) =>
  renderInShell(await FicheLoadingScreen(props));

beforeEach(() => {
  requestHeaders.clear();
  requestHeaders.set(LOCALE_HEADER, "fr");
});

describe("FicheLoadingScreen (REQ-104 — what a fiche shows while it is being fetched)", () => {
  // @req REQ-098
  it("keeps the site header on screen, so orientation survives the navigation", async () => {
    await loadingScreen({ entityType: "people" });

    expect(screen.getByTestId("site-header")).toBeInTheDocument();
  });

  // @req REQ-104
  it("names what is being loaded rather than reporting a bare wait", async () => {
    await loadingScreen({ entityType: "country" });

    expect(screen.getByRole("status")).toHaveTextContent(/fiche pays/i);
  });

  /**
   * The wait used to open on the fiche's own night band, sized to
   * `--afh-globe-stage-height`, under a plate naming the section. The two
   * together filled the viewport, so the fact — the whole content of the wait
   * — sat below the fold and was never read on the routes that wait longest.
   */
  // @req REQ-113
  it("puts the fact on the fold, with no band above it to push it off", async () => {
    const { container } = await loadingScreen({ entityType: "people" });

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
  it("names no page it has not arrived at", async () => {
    await loadingScreen({ entityType: "country" });

    expect(screen.queryByTestId("page-hero")).toBeNull();
    expect(
      screen.queryByRole("navigation", { name: "Fil d'ariane" })
    ).toBeNull();
  });

  // @req REQ-104
  it("waits in the accent the arriving fiche will use, taken from the fiche's own map", async () => {
    const { container } = await loadingScreen({
      entityType: "language-family",
    });

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

/**
 * The shell was hardwired to French, so an English fiche waited under a
 * French masthead and a French announcement. The screen has no params to
 * read; the request header the middleware sets is the only locale it can see.
 */
describe("FicheLoadingScreen — the wait is in the page's locale (REQ-140)", () => {
  // @req REQ-140
  it("dresses the shell and the announcement in the request's locale", async () => {
    requestHeaders.set(LOCALE_HEADER, "en");
    await loadingScreen({ entityType: "country" });

    expect(screen.getByRole("status")).toHaveTextContent(/country fiche/i);
    expect(screen.getByRole("status")).not.toHaveTextContent(/fiche pays/i);
    expect(screen.getByTestId("site-brand")).toHaveAttribute("href", "/en");
  });

  // @req REQ-140
  it("falls back to the default locale when the header is absent", async () => {
    requestHeaders.clear();
    await loadingScreen({ entityType: "people" });

    expect(screen.getByTestId("site-brand")).toHaveAttribute("href", "/en");
  });
});
