import { readFileSync } from "node:fs";
import { join } from "node:path";

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
   *
   * The case used to assert three entities and three hues, which conflated two
   * claims. The one the charter makes is that the categorical set is closed at
   * four (§5.2); the one the code satisfied by accident is one hue per entity,
   * and that stopped being true when the name axis joined — `.afh-accent-name`
   * aliases ocre, as `color.css` decided for the name fiche. What has to stay
   * true is one *class* per entity: the distinct selector is what lets a "no
   * foreign accent on this page" check tell a name's own scope from a
   * country's leaking into it.
   */
  // @req REQ-091
  it("gives each entity its own class, and covers every one it declares", () => {
    const entities = Object.keys(
      DIRECTORY_ACCENT_CLASS
    ) as DirectoryEntityType[];

    expect(entities).toHaveLength(FACETS.length);
    expect(new Set(Object.values(DIRECTORY_ACCENT_CLASS)).size).toBe(
      entities.length
    );
  });

  /**
   * And the hues behind those classes stay inside the closed categorical set.
   * Read from the stylesheet rather than restated here, so the palette has one
   * source of truth and this cannot drift from it.
   */
  // @req REQ-091
  it("resolves every class to one of the four categorical hues", () => {
    const css = readFileSync(
      join(__dirname, "..", "..", "..", "styles", "tokens", "color.css"),
      "utf8"
    );

    for (const accentClass of Object.values(DIRECTORY_ACCENT_CLASS)) {
      const block = css.slice(css.indexOf(`.${accentClass} {`));
      const declaration = block.slice(0, block.indexOf("}"));

      expect(declaration, `${accentClass} declares no --accent`).toMatch(
        /--accent:\s*var\(--afh-cat-(ocre|teal|terre|perv)\)/
      );
    }
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
