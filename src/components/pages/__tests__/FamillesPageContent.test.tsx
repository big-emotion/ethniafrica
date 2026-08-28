import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

import { FamillesPageContent } from "../FamillesPageContent";

/**
 * The directory is a list, not a second reading surface.
 *
 * Two family renderings used to coexist: this page rendered a tabbed detail
 * beside the list under `?family=<id>`, while the charter fiche — night band,
 * globe, parchment — lived at `/fr/familles/<id>` and was reachable only from
 * a people fiche. Picking a family here must now open that one fiche.
 */

const push = vi.fn();
const replace = vi.fn();
let currentSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
  usePathname: () => "/fr/familles",
  useSearchParams: () => currentSearchParams,
}));

vi.mock("@/hooks/use-language", () => ({
  useLanguage: () => ({ language: "fr", setLanguage: vi.fn() }),
}));

vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));

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

vi.mock("@/components/views/LanguageFamilyView", () => ({
  LanguageFamilyView: ({
    onFamilySelect,
  }: {
    onFamilySelect: (family: { id: string; nameFr: string }) => void;
  }) => (
    <button
      type="button"
      onClick={() => onFamilySelect({ id: "FLG_BANTU", nameFr: "Bantu" })}
    >
      Bantu
    </button>
  ),
}));

beforeEach(() => {
  push.mockClear();
  replace.mockClear();
  currentSearchParams = new URLSearchParams();
});

describe("FamillesPageContent", () => {
  // @req REQ-091
  it("opens the family fiche route when a family is picked", () => {
    render(<FamillesPageContent />);

    fireEvent.click(screen.getByRole("button", { name: "Bantu" }));

    expect(push).toHaveBeenCalledWith("/fr/familles/FLG_BANTU");
  });

  // @req REQ-091
  it("never routes a picked family back into a query parameter", () => {
    render(<FamillesPageContent />);

    fireEvent.click(screen.getByRole("button", { name: "Bantu" }));

    const navigatedTo = [...push.mock.calls, ...replace.mock.calls]
      .map(([url]) => String(url))
      .join(" ");
    expect(navigatedTo).not.toContain("?family=");
  });

  // @req REQ-091
  it("forwards a bookmarked ?family= URL to the fiche instead of rendering a detail beside the list", () => {
    currentSearchParams = new URLSearchParams("family=FLG_BANTU");

    render(<FamillesPageContent />);

    expect(replace).toHaveBeenCalledWith("/fr/familles/FLG_BANTU");
  });

  // The directory read its own query and passed the identifier through
  // untouched, which made `?family=//host` an open redirect — a browser reads
  // two leading slashes as the start of a host. It shares the resolver the
  // country and people forms use now, and this is what keeps it there.
  // @req REQ-091
  it("encodes a bookmarked identifier, so a crafted query cannot leave the site", () => {
    currentSearchParams = new URLSearchParams("family=//evil.com");

    render(<FamillesPageContent />);

    expect(replace).toHaveBeenCalledWith("/fr/familles/%2F%2Fevil.com");
  });

  // @req REQ-091
  it("shows the list alone, with no prompt to pick a family into an empty panel", () => {
    render(<FamillesPageContent />);

    expect(screen.getByRole("button", { name: "Bantu" })).toBeTruthy();
    expect(screen.queryByText(/Sélectionnez une famille linguistique/)).toBe(
      null
    );
  });
});
