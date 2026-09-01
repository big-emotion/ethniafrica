import { describe, expect, it } from "vitest";

import { ACCESS_MODE_LABELS } from "@/lib/hubs/moduleRegistry";
import { getLocalizedRoute } from "@/lib/routing";
import { getSiteTree } from "@/lib/siteTree";

describe("getSiteTree — access modes are sections, not destinations", () => {
  /**
   * The three axis landing pages were deleted with ETNI-1555: the reader picks
   * a module, never an intermediate page. The tree feeds both `/fr/plan-du-site`
   * and `sitemap.xml`, so a leftover entry does not merely dead-end a reader —
   * it publishes a 404 to every crawler that reads the sitemap.
   */
  // @req REQ-114
  it("links to no retired axis landing page", () => {
    const hrefs = getSiteTree("fr").flatMap((section) =>
      section.links.map((link) => link.href)
    );

    for (const page of ["atlasHub", "dossiersHub", "jeuxHub"] as const) {
      expect(hrefs, page).not.toContain(getLocalizedRoute("fr", page));
    }
  });

  // @req REQ-110
  it("still names its rubrics with the canonical access-mode labels", () => {
    const tree = getSiteTree("fr");

    expect(tree.find((section) => section.id === "dossiers")?.title).toBe(
      ACCESS_MODE_LABELS.dossiers
    );
    expect(tree.find((section) => section.id === "jeux")?.title).toBe(
      ACCESS_MODE_LABELS.jeux
    );
  });
});
