import { describe, expect, it } from "vitest";

import {
  DIRECTORY_ACCENT_CLASS,
  type DirectoryEntityType,
} from "@/lib/hubs/directoryAccent";
import { FACETS } from "@/lib/hubs/facets";

/**
 * Charter §3.2/§7 — one accent per entity on a listing surface.
 *
 * This suite used to test `DirectoryHero` as well: the component that framed a
 * directory page, with its Display-scale H1 and its pill controls. The three
 * directories became three facets of one hub, that component lost its last
 * caller, and the cases that rendered it went with it — they asserted pills
 * were `<button>`s, and a facet's are anchors.
 *
 * What survived the merge is the table itself, which is load-bearing:
 * `FacetHubShell` paints a facet's whole subtree from it, and every
 * `FacetDefinition` names its hue by it. So this is now a contract on a scale
 * rather than on a component — which is why it sits beside the scale.
 */
describe("directory accent scale — one hue per entity", () => {
  // @req REQ-091
  it("maps peoples to terre, countries to ocre, families to teal", () => {
    expect(DIRECTORY_ACCENT_CLASS.people).toBe("afh-accent-terre");
    expect(DIRECTORY_ACCENT_CLASS.country).toBe("afh-accent-ocre");
    expect(DIRECTORY_ACCENT_CLASS["language-family"]).toBe("afh-accent-teal");
  });

  /**
   * Peoples takes terre here and not on a fiche, where terre is reserved for
   * IdentityPanel's colonial marker. Two scales, deliberately — and the reason
   * this one keeps the word "directory" after the directories went away.
   */
  // @req REQ-091
  it("gives each entity a distinct hue, and covers every one it declares", () => {
    const entities = Object.keys(
      DIRECTORY_ACCENT_CLASS
    ) as DirectoryEntityType[];

    expect(entities).toHaveLength(3);
    expect(new Set(Object.values(DIRECTORY_ACCENT_CLASS)).size).toBe(3);
  });

  /**
   * The facets are the only surface reading this scale now, so a hue it
   * declares for an entity no facet claims is a hue nothing paints.
   */
  // @req REQ-114
  it("declares no hue the facets do not claim", () => {
    const claimed = new Set(FACETS.map((facet) => facet.entityType));
    const declared = Object.keys(
      DIRECTORY_ACCENT_CLASS
    ) as DirectoryEntityType[];

    for (const entity of declared) {
      expect(claimed.has(entity)).toBe(true);
    }
  });
});
