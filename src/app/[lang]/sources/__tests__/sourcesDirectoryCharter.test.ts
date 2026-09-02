import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * What the sources directory asserts, held in place.
 *
 * These are the four rulings the brand and actions charters produced for this
 * surface, each of which is invisible in a diff and would be undone within two
 * sprints by someone who never read them.
 */

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

const PAGE = "src/app/[lang]/sources/page.tsx";
const BADGE = "src/components/sources/SourceStandingBadge.tsx";
const ROW = "src/components/sources/SourceRow.tsx";

describe("sources directory charter", () => {
  /**
   * A source is apparatus, not content, and `afh-parchment` is the fiche's
   * ground — the surface a *document of the corpus* is written on. Painting
   * the bibliography with it would say the directory is another fiche.
   */
  // @req REQ-114
  it("is not written on the fiche's parchment", () => {
    expect(read(PAGE)).not.toContain("afh-parchment");
  });

  /**
   * `FacetHubShell` carries the globe, the three-facet switcher and the single
   * h1 the atlas facets share. Sources is not an axis — `routing.ts` gives it
   * no prefix because no hub lists it — so borrowing the shell would put it
   * under a switcher that cannot switch to it.
   */
  // @req REQ-114
  it("borrows the atlas machinery without borrowing the atlas shell", () => {
    const page = read(PAGE);

    expect(page).not.toContain("FacetHubShell");
    expect(page).toContain("FacetFilterBar");
    expect(page).toContain("FacetPagination");
    expect(page).toContain("PageLayout");
  });

  /**
   * brand-charter §5.2: a page has one accent, and it is the axis's or the
   * entity's colour. This page is neither, and a fifth meaning laid over the
   * four categorical hues is a code a reader cannot learn.
   */
  // @req REQ-114
  it("claims no page accent, having no axis to take one from", () => {
    expect(read(PAGE)).not.toMatch(/afh-accent-/);
  });

  /**
   * The filters are a plain GET form rendered on the server. A directive here
   * would turn the page into a client component, and the filtered view would
   * stop having an address a reader can send.
   */
  // @req REQ-114
  it("stays a server component, so a filtered reading keeps an address", () => {
    expect(read(PAGE)).not.toContain('"use client"');
  });

  /**
   * actions-charter §6: radius 0 is the source apparatus — citations, tier
   * marks, version banners — because the sharp corner says this is a document
   * rather than an application. A pill would read as a removable filter chip.
   */
  // @req REQ-092
  it("gives the apparatus the square corner and the rows the flat list", () => {
    expect(read(BADGE)).toContain("rounded-none");
    expect(read(BADGE)).not.toContain("rounded-full");
    // A card is the atlas's unit of content; a bibliography is a document.
    expect(read(ROW)).not.toMatch(/rounded-afh-(lg|xl)/);
  });
});
