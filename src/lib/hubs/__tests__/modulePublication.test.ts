import { describe, expect, it } from "vitest";

import {
  MODULE_DEFINITIONS,
  getModulesForAccessMode,
} from "@/lib/hubs/moduleRegistry";
import { isModulePublished } from "@/lib/hubs/moduleOffer";

/**
 * The freeze of the dossiers axis, asserted where it is declared.
 *
 * `editorialReadiness` used to answer one question — should the hub invite the
 * reader in — while the page behind it stayed readable by URL. That split is
 * what the reader caught: a module wearing **Bientôt** in the menu whose text
 * a direct link still served in full. These tests hold the two halves
 * together, so unfreezing a dossier is one word in the registry and not a
 * hunt through eleven routes.
 */
describe("module publication", () => {
  // @req REQ-114
  it("withholds a module its editor declared draft", () => {
    expect(isModulePublished("frise")).toBe(false);
  });

  // @req REQ-114
  it("serves a module its editor declared ready", () => {
    expect(isModulePublished("anecdotes")).toBe(true);
  });

  // An unknown id is a caller naming a module that no longer exists. Serving
  // its page would mean serving a route the registry cannot describe.
  // @req REQ-114
  it("withholds a module the registry does not declare", () => {
    expect(isModulePublished("dossier-that-never-shipped")).toBe(false);
  });

  // The freeze itself, stated as a number rather than a list, so adding a
  // dossier back is a deliberate edit to this line.
  // @req REQ-114
  it("leaves Anecdotes as the only published dossier", () => {
    const published = getModulesForAccessMode("dossiers")
      .filter((module) => isModulePublished(module.id))
      .map((module) => module.id);

    expect(published).toEqual(["anecdotes"]);
  });

  // The freeze is confined to the dossiers: withdrawing the atlas or the
  // games was never asked for, and a readiness flip is cheap enough to make
  // by accident.
  // @req REQ-114
  it("leaves every atlas and games module published", () => {
    const withheld = MODULE_DEFINITIONS.filter(
      (module) =>
        module.accessMode !== "dossiers" && !isModulePublished(module.id)
    );

    expect(withheld).toEqual([]);
  });
});
