import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FacetPagination } from "@/components/hubs/facets/FacetPagination";

/**
 * What the pager owes a reader, as opposed to what it computes.
 *
 * The arithmetic is pinned down in `lib/hubs/__tests__/pagination.test.ts`.
 * What is left here is the part a reader meets: that the page they are on is
 * announced and not offered as a link to itself, that no control leads past
 * either end, and that changing how much is shown does not strand them on a
 * page number that no longer exists.
 */

function href(page: number, size: number): string {
  return `/fr/explorer/peuples?p=${page}&t=${size}`;
}

function renderPager(overrides: Record<string, unknown> = {}) {
  return render(
    <FacetPagination
      position="top"
      page={1}
      pageCount={41}
      total={803}
      pageSize={20}
      pageSizes={[20, 50, 100]}
      buildHref={href}
      unitLabel="peuples"
      {...overrides}
    />
  );
}

describe("facet pagination", () => {
  // @req REQ-108
  it("announces the current page instead of linking it to itself", () => {
    renderPager({ page: 3 });
    const current = screen.getByRole("link", { current: "page" });
    expect(current).toHaveTextContent("3");
  });

  // @req REQ-108
  it("offers a direct link to any page it lists", () => {
    renderPager({ page: 20 });
    // The window around page 20 of 41, plus both edges.
    for (const page of [1, 19, 21, 41]) {
      expect(
        screen.getByRole("link", { name: `Page ${page}` })
      ).toHaveAttribute("href", href(page, 20));
    }
  });

  /**
   * The chevrons carry no accessible name of their own, so the step controls
   * are named in words. A pager a screen reader reads as "link, link" is a
   * pager nobody can use.
   */
  // @req REQ-108
  it("names its step controls in words", () => {
    renderPager({ page: 3 });
    expect(
      screen.getByRole("link", { name: "Page précédente" })
    ).toHaveAttribute("href", href(2, 20));
    expect(screen.getByRole("link", { name: "Page suivante" })).toHaveAttribute(
      "href",
      href(4, 20)
    );
  });

  // @req REQ-108
  it("offers no step past either end of the corpus", () => {
    const first = renderPager({ page: 1 });
    expect(
      within(first.container).queryByRole("link", { name: "Page précédente" })
    ).toBeNull();
    first.unmount();

    renderPager({ page: 41 });
    expect(screen.queryByRole("link", { name: "Page suivante" })).toBeNull();
  });

  /**
   * Position, not quantity. The header above already states how many the
   * selection holds; what it cannot say is where in it the reader has got to.
   * Saying the total twice would give the page two places to keep in step.
   */
  // @req REQ-108
  it("says which slice of the selection is on screen", () => {
    renderPager({ page: 3 });
    expect(screen.getByTestId("facet-pagination-count")).toHaveTextContent(
      "41 à 60 sur 803"
    );
  });

  // @req REQ-108
  it("counts the last page short rather than past the total", () => {
    renderPager({ page: 41 });
    expect(screen.getByTestId("facet-pagination-count")).toHaveTextContent(
      "801 à 803 sur 803"
    );
  });

  /** Naming what is paged belongs to the landmark, not to a repeated total. */
  // @req REQ-108
  it("names what it pages through on the landmark", () => {
    const { container } = renderPager();
    expect(container.querySelector("nav")).toHaveAttribute(
      "aria-label",
      expect.stringContaining("peuples")
    );
  });

  /**
   * Resizing sends the reader to page one on purpose: page 41 of forty-one
   * twenty-row pages is page nine of a hundred-row reading, and keeping the
   * number would land them past the end of the list they just asked for.
   */
  // @req REQ-108
  it("returns to the first page when the page size changes", () => {
    renderPager({ page: 41 });
    expect(screen.getByRole("link", { name: "100 par page" })).toHaveAttribute(
      "href",
      href(1, 100)
    );
  });

  // @req REQ-108
  it("marks the page size in force", () => {
    renderPager({ pageSize: 50 });
    expect(screen.getByRole("link", { name: "50 par page" })).toHaveAttribute(
      "aria-current",
      "true"
    );
  });

  /**
   * The foot repeats the pages and nothing else. A second result count and a
   * second size control would be two more things claiming to be the page's
   * only statement of each.
   */
  // @req REQ-108
  it("repeats only the pages at the foot of the list", () => {
    renderPager({ position: "bottom", page: 3 });
    expect(screen.getByRole("link", { name: "Page 1" })).toBeInTheDocument();
    expect(screen.queryByTestId("facet-pagination-count")).toBeNull();
    expect(screen.queryByRole("link", { name: "50 par page" })).toBeNull();
  });

  /** Two pagers on one page, so neither may be "the" navigation landmark. */
  // @req REQ-108
  it("distinguishes the two pagers by name", () => {
    const top = renderPager().container.querySelector("nav");
    const bottom = renderPager({ position: "bottom" }).container.querySelector(
      "nav"
    );
    expect(top?.getAttribute("aria-label")).not.toBe(
      bottom?.getAttribute("aria-label")
    );
  });

  /**
   * One page is no position and no step. Anything the pager could still show
   * there — the total, a lone "1" — the header already says better.
   */
  // @req REQ-108
  it("renders nothing at either end when everything fits on one page", () => {
    for (const position of ["top", "bottom"] as const) {
      const { container } = renderPager({ position, pageCount: 1, total: 12 });
      expect(container).toBeEmptyDOMElement();
    }
  });

  /** Every control is a 44px target, the minimum the rest of the atlas holds to. */
  // @req REQ-108
  it("sizes every control as a touch target", () => {
    const { container } = renderPager({ page: 20 });
    const controls = container.querySelectorAll("nav a");
    expect(controls.length).toBeGreaterThan(0);
    for (const control of controls) {
      expect(control.className).toContain("min-h-11");
      expect(control.className).toContain("min-w-11");
    }
  });
});
