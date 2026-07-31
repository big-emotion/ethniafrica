/**
 * Tests for NamesAtlasView (Epic 8 Story 8.10 / ETNI-474).
 *
 * The view MUST:
 *   - render an SSR alphabetically-grouped list of name entries, each
 *     linking to its people fiche's #noms anchor,
 *   - offer a search input using the submit-button pattern (no live search
 *     on keystroke),
 *   - render the five filter chips (endonyme / exonyme / graphie
 *     historique / patronyme / noms imposés) and let active ones dismiss
 *     via a × control,
 *   - announce the result count through an aria-live="polite" region,
 *   - render a calm, prefilled empty state when the result set is empty
 *     (no emoji, no "Oops").
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NamesAtlasView } from "@/components/names/NamesAtlasView";
import type { NameAtlasEntry } from "@/components/names/NamesAtlasView";

const populatedNames: NameAtlasEntry[] = [
  {
    id: "1",
    nameText: "Jieng",
    nameType: "endonym",
    imposedBy: null,
    peopleId: "PPL_JIENG",
    peopleName: "Jieng",
  },
  {
    id: "2",
    nameText: "Dinka",
    nameType: "exonym",
    imposedBy: "administration coloniale britannique",
    peopleId: "PPL_JIENG",
    peopleName: "Jieng",
  },
  {
    id: "3",
    nameText: "Bakongo",
    nameType: "endonym",
    imposedBy: null,
    peopleId: "PPL_BAKONGO",
    peopleName: "Bakongo",
  },
];

function renderView(
  props: Partial<React.ComponentProps<typeof NamesAtlasView>> = {}
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={client}>
      <NamesAtlasView
        initialNames={populatedNames}
        initialTotal={populatedNames.length}
        {...props}
      />
    </QueryClientProvider>
  );
}

describe("NamesAtlasView", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  // (a) SSR alphabetically-grouped list
  // @req REQ-056
  it("renders an alphabetically grouped SSR list with group headings", () => {
    renderView();

    expect(screen.getByText("B")).toBeInTheDocument();
    expect(screen.getByText("D")).toBeInTheDocument();
    expect(screen.getByText("J")).toBeInTheDocument();

    const html = document.body.innerHTML;
    const bIndex = html.indexOf("Bakongo");
    const dIndex = html.indexOf("Dinka");
    const jIndex = html.indexOf("Jieng");
    expect(bIndex).toBeLessThan(dIndex);
    expect(dIndex).toBeLessThan(jIndex);
  });

  // (f) each entry links to the people fiche's #noms anchor
  // @req REQ-056
  it("links each atlas entry to the corresponding people fiche's #noms anchor", () => {
    renderView();

    const link = screen.getByRole("link", { name: /Bakongo/ });
    expect(link).toHaveAttribute("href", "/fr/peuples/PPL_BAKONGO#noms");
  });

  // (b) search input uses the submit-button pattern
  // @req REQ-056
  it("does not search on keystroke, only on submit", () => {
    renderView();

    const input = screen.getByRole("searchbox", { name: "Rechercher un nom" });
    fireEvent.change(input, { target: { value: "dinka" } });

    expect(global.fetch).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Rechercher" }));

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v2/names?")
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("q=dinka")
    );
  });

  // (c) the five filter chips render and dismiss via ×
  // @req REQ-056
  it("renders the five filter chips and lets an active one dismiss via ×", () => {
    renderView();

    expect(
      screen.getByRole("button", { name: "endonyme" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "exonyme" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "graphie historique" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "patronyme" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "noms imposés" })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "endonyme" }));

    const dismiss = screen.getByRole("button", {
      name: "Supprimer le filtre endonyme",
    });
    expect(dismiss).toBeInTheDocument();

    fireEvent.click(dismiss);
    expect(
      screen.queryByRole("button", { name: "Supprimer le filtre endonyme" })
    ).not.toBeInTheDocument();
  });

  // (d) result count announced via aria-live="polite"
  // @req REQ-056
  it("announces the result count via an aria-live polite region", () => {
    renderView();

    const region = screen.getByText(/3 résultats/);
    expect(region).toHaveAttribute("aria-live", "polite");
  });

  // (e) empty state: spelling guidance, browse-by-type links, prefilled signalement
  // @req REQ-056
  it("renders the calm empty state with no emoji and no Oops when there are no results", () => {
    renderView({ initialNames: [], initialTotal: 0, initialQuery: "xyzabc" });

    expect(screen.getByText(/Vérifiez l'orthographe/)).toBeInTheDocument();
    expect(screen.getByText("Parcourir par type de nom :")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "endonyme" })).toHaveAttribute(
      "href",
      "/fr/noms?nameType=endonym"
    );

    const reportLink = screen.getByRole("link", {
      name: "Signaler une donnée manquante",
    });
    expect(reportLink).toHaveAttribute("href", "/fr/contribute?q=xyzabc");

    expect(document.body.innerHTML).not.toMatch(/Oops/i);
    expect(document.body.textContent).not.toMatch(
      /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u
    );
  });
});
