import { describe, expect, it } from "vitest";
import { moduleHref } from "@/lib/hubs/moduleHref";
import type { HubModuleDefinition } from "@/lib/hubs/moduleRegistry";

const definition = (
  overrides: Partial<HubModuleDefinition>
): HubModuleDefinition => ({
  id: "x",
  name: "X",
  accessMode: "jouer",
  page: null,
  availability: "data",
  ...overrides,
});

describe("moduleHref", () => {
  // @req REQ-114
  it("addresses a game by its slug under the Jouer hub", () => {
    expect(moduleHref("fr", definition({ gameSlug: "mercator" }))).toBe(
      "/fr/jouer/mercator"
    );
  });

  // @req REQ-114
  it("localises a module that owns a PageType", () => {
    expect(
      moduleHref(
        "fr",
        definition({ page: "countries", accessMode: "explorer" })
      )
    ).toBe("/fr/pays");
  });

  // @req REQ-114
  it("lets the slug win when a module carries both", () => {
    expect(
      moduleHref(
        "fr",
        definition({ page: "countries", gameSlug: "vraie-taille" })
      )
    ).toBe("/fr/jouer/vraie-taille");
  });

  // @req REQ-114
  it("returns null when a module is addressable by neither", () => {
    expect(moduleHref("fr", definition({}))).toBeNull();
  });
});
