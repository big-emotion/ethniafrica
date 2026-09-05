import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ConsentProvider } from "@/hooks/use-consent";

import CountryFicheLoading from "@/app/[lang]/atlas/pays/[slug]/loading";
import PeopleFicheLoading from "@/app/[lang]/atlas/peuples/[slug]/loading";
import FamilyFicheLoading from "@/app/[lang]/atlas/familles/[slug]/loading";
import { LOCALE_HEADER } from "@/lib/locale";
import { getCountryRoute } from "@/lib/routing";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => getCountryRoute("fr", "NGA"),
  useSearchParams: () => new URLSearchParams(),
}));

// A `loading.tsx` receives no params, so the screen it mounts reads the
// locale the middleware stamped on the request.
const requestHeaders = vi.hoisted(() => new Map<string, string>());

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => ({
    get: (name: string) => requestHeaders.get(name) ?? null,
  })),
}));

/** The shell these files render carries a footer that reads the consent context. */
const renderInShell = (ui: ReactElement) =>
  render(<ConsentProvider>{ui}</ConsentProvider>);

/**
 * A loading file hands back the shared screen unrendered, and that screen is
 * an async server component: it is resolved here the way the server would,
 * so the test still reads what each route mounts rather than the screen alone.
 */
const renderLoadingRoute = async (Loading: () => ReactElement) => {
  const mounted = Loading();
  const resolve = mounted.type as (
    props: unknown
  ) => Promise<ReactElement> | ReactElement;
  return renderInShell(await resolve(mounted.props));
};

beforeEach(() => {
  requestHeaders.clear();
  requestHeaders.set(LOCALE_HEADER, "fr");
});

/**
 * The three fiche segments are the slow ones — they each fan out to several
 * Supabase reads before the first byte — and App Router blocks the whole
 * navigation on that response unless the segment declares a loading file.
 * Without one the reader clicks and nothing happens at all, which is the
 * failure these routes existed with; hence a test per segment rather than a
 * single test on the shared component.
 */
describe("fiche routes declare a loading surface (REQ-104)", () => {
  // @req REQ-104
  it("shows a named wait while a country fiche is fetched", async () => {
    await renderLoadingRoute(CountryFicheLoading);

    expect(screen.getByRole("status")).toHaveTextContent(/fiche pays/i);
  });

  // @req REQ-104
  it("shows a named wait while a people fiche is fetched", async () => {
    await renderLoadingRoute(PeopleFicheLoading);

    expect(screen.getByRole("status")).toHaveTextContent(/fiche peuple/i);
  });

  // @req REQ-104
  it("shows a named wait while a language-family fiche is fetched", async () => {
    await renderLoadingRoute(FamilyFicheLoading);

    expect(screen.getByRole("status")).toHaveTextContent(/fiche famille/i);
  });
});
