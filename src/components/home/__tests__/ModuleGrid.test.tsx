import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ModuleGrid } from "@/components/home/ModuleGrid";
import { MODULE_DEFINITIONS, type HomeModule } from "@/lib/accessModeHubs";
import { getLocalizedRoute } from "@/lib/routing";

// ModuleGrid is a pure presentational component — it renders whatever
// live|soon module list it's given and doesn't know about data probes
// (@/lib/moduleAvailability). This fixture exercises the same route-based
// shape the config carries, independent of Supabase availability.
const modules: HomeModule[] = MODULE_DEFINITIONS.map((def) => ({
  id: def.id,
  title: def.title,
  category: def.category,
  accent: def.accent,
  illustration: def.illustration,
  state: def.page ? "live" : "soon",
  href: def.page ? getLocalizedRoute("fr", def.page) : null,
}));

describe("ModuleGrid — filterable module grid (ETNI-820, ported from contract.test.mjs)", () => {
  // @req FR92
  // @req REQ-044
  it("renders exactly 10 module cards, each carrying data-state live|soon", () => {
    render(<ModuleGrid modules={modules} />);
    const cards = screen.getAllByTestId(/^module-card-/);

    expect(cards).toHaveLength(10);
    for (const card of cards) {
      expect(["live", "soon"]).toContain(card.getAttribute("data-state"));
    }
  });

  // @req FR92
  // @req REQ-044
  it("gives each card a per-card accent and an illustration", () => {
    render(<ModuleGrid modules={modules} />);
    const cards = screen.getAllByTestId(/^module-card-/);

    for (const card of cards) {
      expect(card.getAttribute("style")).toMatch(/--afh-cat-/);
      expect(within(card).getByTestId("module-icon")).toBeInTheDocument();
    }
  });

  // @req FR92
  // @req REQ-044
  it("renders the «Bientôt» label only on soon-state cards", () => {
    render(<ModuleGrid modules={modules} />);
    const soonCards = modules.filter((entry) => entry.state === "soon");
    const liveCards = modules.filter((entry) => entry.state === "live");

    for (const entry of soonCards) {
      const card = screen.getByTestId(`module-card-${entry.id}`);
      expect(within(card).getByText("Bientôt")).toBeInTheDocument();
    }
    for (const entry of liveCards) {
      const card = screen.getByTestId(`module-card-${entry.id}`);
      expect(within(card).queryByText("Bientôt")).not.toBeInTheDocument();
    }
  });

  // @req FR92
  // @req REQ-044
  it("renders the Tout/Explorer/Comprendre/Jouer filter pills with aria-pressed", () => {
    render(<ModuleGrid modules={modules} />);

    const tout = screen.getByRole("button", { name: "Tout" });
    const explorer = screen.getByRole("button", { name: "Explorer" });
    const comprendre = screen.getByRole("button", { name: "Comprendre" });
    const jouer = screen.getByRole("button", { name: "Jouer" });

    expect(tout).toHaveAttribute("aria-pressed", "true");
    expect(explorer).toHaveAttribute("aria-pressed", "false");
    expect(comprendre).toHaveAttribute("aria-pressed", "false");
    expect(jouer).toHaveAttribute("aria-pressed", "false");
  });

  // @req FR92
  // @req REQ-044
  it("Tout shows every module", () => {
    render(<ModuleGrid modules={modules} />);
    expect(screen.getAllByTestId(/^module-card-/)).toHaveLength(10);
  });

  // @req FR92
  // @req REQ-044
  it("activating a category pill filters the grid and toggles aria-pressed", async () => {
    const user = userEvent.setup();
    render(<ModuleGrid modules={modules} />);

    await user.click(screen.getByRole("button", { name: "Explorer" }));

    expect(screen.getByRole("button", { name: "Explorer" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: "Tout" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );

    const explorerCount = modules.filter(
      (module) => module.category === "explorer"
    ).length;
    expect(screen.getAllByTestId(/^module-card-/)).toHaveLength(explorerCount);
  });

  // @req FR92
  // @req REQ-044
  it("returning to Tout after a filter shows all modules again", async () => {
    const user = userEvent.setup();
    render(<ModuleGrid modules={modules} />);

    await user.click(screen.getByRole("button", { name: "Jouer" }));
    await user.click(screen.getByRole("button", { name: "Tout" }));

    expect(screen.getAllByTestId(/^module-card-/)).toHaveLength(10);
    expect(screen.getByRole("button", { name: "Tout" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  // @req FR92
  // @req REQ-044
  it("wraps a live module's card in a link to its route", () => {
    render(<ModuleGrid modules={modules} />);
    const liveModule = modules.find((module) => module.state === "live");
    const card = screen.getByTestId(`module-card-${liveModule?.id}`);

    expect(card.closest("a")).toHaveAttribute("href", liveModule?.href);
  });

  // @req FR92
  // @req REQ-044
  it("does not link a soon module's card anywhere", () => {
    render(<ModuleGrid modules={modules} />);
    const soonModule = modules.find((module) => module.state === "soon");
    const card = screen.getByTestId(`module-card-${soonModule?.id}`);

    expect(card.closest("a")).toBeNull();
  });
});
