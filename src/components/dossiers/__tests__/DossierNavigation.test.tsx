import { getDossierThemeHref } from "@/lib/dossiers/themes";
import { getLocalizedRoute } from "@/lib/routing";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DossierNavigation } from "@/components/dossiers/DossierNavigation";
import { DossierDirectory } from "@/components/dossiers/DossierDirectory";
import { DossierLinks } from "@/components/dossiers/DossierLinks";
import { ModuleAvailabilityProvider } from "@/components/hubs/ModuleAvailabilityProvider";

afterEach(cleanup);
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

describe("dossier discovery", () => {
  // @req REQ-140
  it("preserves English when selecting a theme or opening a fiche dossier", () => {
    render(
      <>
        <DossierNavigation language="en" />
        <DossierLinks
          language="en"
          kind="country"
          id="COD"
          section="etymology"
        />
      </>
    );
    fireEvent.change(screen.getByRole("combobox", { name: "Choose a theme" }), {
      target: { value: "noms" },
    });
    expect(push).toHaveBeenCalledWith(getDossierThemeHref("noms", "en"));
    expect(
      screen.getByRole("link", { name: "Who gave this name?" })
    ).toHaveAttribute("href", getLocalizedRoute("en", "nommer"));
  });
  // @req REQ-114
  it("offers theme destinations instead of individual dossiers in global navigation", () => {
    render(<DossierNavigation />);
    expect(
      screen.getByRole("link", { name: "Noms et identités" })
    ).toHaveAttribute("href", getDossierThemeHref("noms"));
    expect(
      screen.queryByRole("link", { name: "Qui a donné ce nom ?" })
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Bientôt")).not.toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Choisir un thème" })
    ).toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "noms" },
    });
    expect(push).toHaveBeenCalledWith(getDossierThemeHref("noms"));
  });

  // @req REQ-114
  it("filters dossiers by query and separates the anecdote reading format", () => {
    render(<DossierDirectory />);
    const results = screen.getByRole("region", { name: "Dossiers à lire" });
    expect(
      within(results).getByRole("link", { name: "Qui a donné ce nom ?" })
    ).toBeInTheDocument();
    expect(
      within(results).queryByRole("link", { name: "Anecdotes" })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Lire les anecdotes" })
    ).toHaveAttribute("href", getLocalizedRoute("fr", "anecdotes"));
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "introuvable" },
    });
    expect(within(results).queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Aucun dossier");
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "nom" },
    });
    expect(
      within(results).getByRole("link", { name: "Qui a donné ce nom ?" })
    ).toHaveAttribute("href", getLocalizedRoute("fr", "nommer"));
  });

  // @req REQ-106
  it("does not expose unavailable dossier links from a fiche", () => {
    const { container } = render(
      <ModuleAvailabilityProvider value={{ nommer: false }}>
        <DossierLinks kind="country" id="COD" section="etymology" />
      </ModuleAvailabilityProvider>
    );
    expect(container).toBeEmptyDOMElement();
  });
});
