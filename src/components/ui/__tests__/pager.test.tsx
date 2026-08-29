import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Pager } from "@/components/ui/Pager";
import { getFacetRoute } from "@/lib/hubs/facets";

const PEUPLES = getFacetRoute("fr", "peoples");

const href = (page: number): string =>
  page <= 1 ? PEUPLES : `${PEUPLES}?page=${page}`;

const numberedLinks = (): HTMLElement[] =>
  screen.getAllByRole("link", { name: /^Page \d+ sur \d+$/ });

describe("Pager — one pager for every paged list (REQ-114)", () => {
  // @req REQ-114
  it("renders nothing for a single page", () => {
    const { container } = render(
      <Pager
        label="Pages de peuples"
        pageNumber={1}
        pageCount={1}
        hrefForPage={href}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  // @req REQ-114
  it("marks the page being read and addresses page one at the bare path", () => {
    render(
      <Pager
        label="Pages de peuples"
        pageNumber={2}
        pageCount={3}
        hrefForPage={href}
      />
    );

    expect(screen.getByRole("link", { name: "Page 1 sur 3" })).toHaveAttribute(
      "href",
      PEUPLES
    );
    expect(screen.getByRole("link", { name: "Page 2 sur 3" })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  // @req REQ-114
  it("drops the step that would leave the range", () => {
    const first = render(
      <Pager
        label="Pages de peuples"
        pageNumber={1}
        pageCount={3}
        hrefForPage={href}
      />
    );
    expect(screen.queryByRole("link", { name: "Page précédente" })).toBeNull();
    expect(screen.getByRole("link", { name: "Page suivante" })).toHaveAttribute(
      "href",
      `${PEUPLES}?page=2`
    );
    first.unmount();

    render(
      <Pager
        label="Pages de peuples"
        pageNumber={3}
        pageCount={3}
        hrefForPage={href}
      />
    );
    expect(screen.queryByRole("link", { name: "Page suivante" })).toBeNull();
    expect(
      screen.getByRole("link", { name: "Page précédente" })
    ).toHaveAttribute("href", `${PEUPLES}?page=2`);
  });

  /**
   * The peoples facet runs to 41 pages. Printing all 41 is the whole reason
   * the old control printed none: a rail that long is unusable on a phone,
   * so the reading was left with a bare "Page suivante" and no way to reach
   * page 30 at all.
   */
  // @req REQ-114
  it("windows a long sequence instead of printing every page", () => {
    render(
      <Pager
        label="Pages de peuples"
        pageNumber={20}
        pageCount={41}
        hrefForPage={href}
      />
    );

    const names = numberedLinks().map((link) =>
      link.getAttribute("aria-label")
    );

    expect(names.length).toBeLessThanOrEqual(7);
    expect(names).toContain("Page 1 sur 41");
    expect(names).toContain("Page 19 sur 41");
    expect(names).toContain("Page 20 sur 41");
    expect(names).toContain("Page 21 sur 41");
    expect(names).toContain("Page 41 sur 41");
  });

  // A jump of more than one page has to look like a jump, or 1 19 20 reads
  // as a contiguous run and the reader trusts a sequence that is not there.
  // @req REQ-114
  it("marks each gap in the windowed sequence", () => {
    const { container } = render(
      <Pager
        label="Pages de peuples"
        pageNumber={20}
        pageCount={41}
        hrefForPage={href}
      />
    );

    expect(container.querySelectorAll(".afh-pager-gap")).toHaveLength(2);
  });

  // @req REQ-114
  it("prints a short sequence whole, with no gaps", () => {
    const { container } = render(
      <Pager
        label="Pages de peuples"
        pageNumber={2}
        pageCount={5}
        hrefForPage={href}
      />
    );

    expect(numberedLinks()).toHaveLength(5);
    expect(container.querySelectorAll(".afh-pager-gap")).toHaveLength(0);
  });

  // @req REQ-114
  it("names the sequence it pages through", () => {
    render(
      <Pager
        label="Pages de familles"
        pageNumber={1}
        pageCount={2}
        hrefForPage={href}
      />
    );

    expect(
      screen.getByRole("navigation", { name: "Pages de familles" })
    ).toBeInTheDocument();
  });
});
