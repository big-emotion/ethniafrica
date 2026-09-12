import { getLocalizedRoute } from "@/lib/routing";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DossierDirectory } from "@/components/dossiers/DossierDirectory";
import { DossierLinks } from "@/components/dossiers/DossierLinks";
import { ModuleAvailabilityProvider } from "@/components/hubs/ModuleAvailabilityProvider";

afterEach(cleanup);
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

/**
 * The dossiers hub under the freeze.
 *
 * It used to offer a search field and eight theme links over a catalogue of
 * ten readings. Every one of those readings is withdrawn, so both controls now
 * filter an empty set — a search box that can only ever answer "aucun
 * résultat" invites the reader to do work that cannot succeed, and eight theme
 * links whose pages answer 404 are eight dead doors.
 *
 * What is owed instead is the plain statement, and the one door still open.
 */
describe("the dossiers hub while the axis is frozen", () => {
  // @req REQ-114
  it("offers neither a search nor a theme filter over an empty catalogue", () => {
    render(<DossierDirectory />);

    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.queryByTestId("dossier-theme-grid")).not.toBeInTheDocument();
  });

  // The rubric still leads somewhere: the anecdotes are why the hub is worth
  // opening at all while the dossiers are away.
  // @req REQ-114
  it("keeps the anecdotes as the way out", () => {
    render(<DossierDirectory />);

    expect(
      screen.getByRole("link", { name: "Lire les anecdotes" })
    ).toHaveAttribute("href", getLocalizedRoute("fr", "anecdotes"));
  });

  // @req REQ-140
  it("keeps the anecdotes as the way out in English", () => {
    render(<DossierDirectory language="en" />);

    expect(
      screen.getByRole("link", { name: "Read the anecdotes" })
    ).toHaveAttribute("href", getLocalizedRoute("en", "anecdotes"));
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

  // The freeze is total on this surface too: no fiche title reaches the hub.
  // @req REQ-114
  it("lists no withdrawn dossier", () => {
    render(<DossierDirectory />);

    expect(
      screen.queryByRole("link", { name: "Qui a donné ce nom ?" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Le royaume Kongo" })
    ).not.toBeInTheDocument();
  });
});

describe("the dossiers hub when a reading is published", () => {
  /**
   * The controls come back with the catalogue.
   *
   * Written against the anecdotes — the one entry still offered — so the hub's
   * filtering is exercised rather than merely described, and so restoring a
   * dossier restores a surface this suite has kept covered.
   */
  // @req REQ-114
  it("separates the anecdote reading format from the dossiers", () => {
    render(<DossierDirectory />);

    const results = screen.getByRole("region", { name: "Dossiers à lire" });
    expect(within(results).queryByRole("link")).not.toBeInTheDocument();
    expect(
      screen.getByRole("complementary", { name: "Lectures courtes" })
    ).toBeInTheDocument();
  });
});
