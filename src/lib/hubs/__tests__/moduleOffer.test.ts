/**
 * The invitation, not the existence (atlas-charter.md §3).
 *
 * `isModuleAvailable` is async because half the question is a row count, and
 * that async-ness is why the header — a client component under a client
 * `PageLayout` — never asked it, and linked two modules the home and the hub
 * were both marking **Bientôt**. These are the contracts of the synchronous
 * resolver that lets every surface answer the same way from whatever it holds.
 */
import { describe, expect, it } from "vitest";

import { isModuleDeclaredReady, isModuleOffered } from "@/lib/hubs/moduleOffer";
import { MODULE_DEFINITIONS } from "@/lib/hubs/moduleRegistry";

const frise = { id: "frise", editorialReadiness: "draft" as const };
const noms = { id: "noms", editorialReadiness: "ready" as const };

describe("isModuleDeclaredReady — the half no table can overturn", () => {
  // @req REQ-114
  it("reads a module in preparation as unready", () => {
    expect(isModuleDeclaredReady(frise)).toBe(false);
  });

  // @req REQ-114
  it("reads a declared-ready module as ready", () => {
    expect(isModuleDeclaredReady(noms)).toBe(true);
  });
});

describe("isModuleOffered — one answer, whatever the surface holds", () => {
  /**
   * Readiness is declared, so it outranks anything measured: a probe that
   * found rows cannot promote a module its editor has said is not worth the
   * trip. This is the ordering `isModuleAvailable` already applies server
   * side, and stating it here is what keeps the two from parting.
   */
  // @req REQ-106
  it("withholds the invitation from a module in preparation, full table or not", () => {
    expect(isModuleOffered(frise, { frise: true })).toBe(false);
  });

  // @req REQ-106
  it("withholds it from a declared-ready module whose table came back empty", () => {
    expect(isModuleOffered(noms, { noms: false })).toBe(false);
  });

  // @req REQ-106
  it("offers a ready module whose table holds rows", () => {
    expect(isModuleOffered(noms, { noms: true })).toBe(true);
  });

  /**
   * Storybook, a unit test, any tree rendered without the provider: no probe
   * result reached this surface. Answering the declared half is the honest
   * fallback — it is the half that is always knowable here — and it fails
   * towards offering a built route rather than towards hiding the site.
   */
  // @req REQ-106
  it("falls back to the declared half when no probe result reached the surface", () => {
    expect(isModuleOffered(noms)).toBe(true);
    expect(isModuleOffered(frise)).toBe(false);
    expect(isModuleOffered(noms, null)).toBe(true);
    expect(isModuleOffered(frise, {})).toBe(false);
  });

  // @req REQ-106
  it("answers for every module the registry declares", () => {
    for (const definition of MODULE_DEFINITIONS) {
      expect(typeof isModuleOffered(definition, {})).toBe("boolean");
    }
  });
});
