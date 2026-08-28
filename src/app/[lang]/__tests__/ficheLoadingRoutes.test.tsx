import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { ConsentProvider } from "@/hooks/use-consent";

import CountryFicheLoading from "@/app/[lang]/pays/[slug]/loading";
import PeopleFicheLoading from "@/app/[lang]/peuples/[slug]/loading";
import FamilyFicheLoading from "@/app/[lang]/familles/[slug]/loading";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/fr/pays/NGA",
  useSearchParams: () => new URLSearchParams(),
}));

/** The shell these files render carries a footer that reads the consent context. */
const renderInShell = (ui: ReactElement) =>
  render(<ConsentProvider>{ui}</ConsentProvider>);

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
  it("shows a named wait while a country fiche is fetched", () => {
    renderInShell(<CountryFicheLoading />);

    expect(screen.getByRole("status")).toHaveTextContent(/fiche pays/i);
  });

  // @req REQ-104
  it("shows a named wait while a people fiche is fetched", () => {
    renderInShell(<PeopleFicheLoading />);

    expect(screen.getByRole("status")).toHaveTextContent(/fiche peuple/i);
  });

  // @req REQ-104
  it("shows a named wait while a language-family fiche is fetched", () => {
    renderInShell(<FamilyFicheLoading />);

    expect(screen.getByRole("status")).toHaveTextContent(/fiche famille/i);
  });
});
