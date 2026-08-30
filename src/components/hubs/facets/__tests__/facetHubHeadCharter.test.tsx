import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AfrikBreadcrumbs } from "@/components/layout/AfrikBreadcrumbs";
import { FacetHubShell } from "@/components/hubs/facets/FacetHubShell";
import { DIRECTORY_ACCENT_CLASS } from "@/lib/hubs/directoryAccent";
import { FACETS, getFacet } from "@/lib/hubs/facets";

/**
 * Where a facet says which facet it is.
 *
 * The three facets open on a full-bleed globe some 520px tall, so a head left
 * inside the parchment is below the fold on every screen: a reader landing on
 * `/fr/explorer/peuples` met a dark sphere and a trail, and nothing else named
 * the page. `FicheSequence` settled the same question for the fiches by
 * lifting their head out of the parchment and printing it above the band; this
 * is that rule applied to the hub, and the reason the head strings live in the
 * facet registry — a page is the shell's `children` and cannot render above
 * the band it is under.
 */

// The address is composed, not typed: the shell decides the facet by comparing
// the path to the slug table, so a literal here would keep passing after a move
// that broke the page.
vi.mock("next/navigation", async () => {
  const { getFacetRoute } = await import("@/lib/hubs/facets");
  return { usePathname: () => getFacetRoute("fr", "peoples") };
});

/**
 * The shell stands in for the real one, but it has to render the plate slot:
 * the head is what this file is about, and the head is now a prop the facet
 * hands the shell rather than a block it prints itself. A mock that took only
 * `children` would drop the head and pass the file by asserting nothing.
 */
vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({
    children,
    heroHead,
  }: {
    children: React.ReactNode;
    heroHead?: React.ReactNode;
  }) => (
    <div data-testid="page-layout">
      {heroHead}
      {children}
    </div>
  ),
}));

vi.mock("@/components/atlas/AtlasGlobe", () => ({
  AtlasGlobe: () => <div data-testid="atlas-globe" />,
}));

function renderShell() {
  return render(
    <FacetHubShell peopleCountsByCountry={{ BEN: 12 }} countryIds={["BEN"]}>
      <p>la liste</p>
    </FacetHubShell>
  );
}

describe("the facet head — the page names itself before the globe fills it", () => {
  /**
   * The assertion the whole change exists for. Document order, not a class:
   * a head styled to look like a title but printed under a 520px band is the
   * bug, not the fix.
   */
  // @req REQ-114
  it("prints the facet's title above the globe", () => {
    renderShell();

    const title = screen.getByRole("heading", { level: 1 });
    const globe = screen.getByTestId("facet-globe-island");

    expect(title).toHaveTextContent(getFacet("peoples").title);
    expect(
      title.compareDocumentPosition(globe) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  /**
   * The shell carries the page's only h1, which is why the three facet pages
   * no longer carry one of their own. Two would be the fiche's earlier fault
   * in reverse.
   */
  // @req REQ-114
  it("carries exactly one first-level heading", () => {
    renderShell();

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  /**
   * The head used to inherit the accent from the hub wrapper it sat inside.
   * It sits in the shell's plate now, outside that wrapper, so the scope has
   * to travel with it — unbound, `--accent` falls back to the bare HSL triplet
   * index.css declares under the same name and the ink resolves to nothing.
   */
  // @req REQ-114
  it("carries the facet's own accent scope into the plate", () => {
    renderShell();

    const head = screen.getByTestId("facet-hub-head");
    expect(head).toHaveClass(DIRECTORY_ACCENT_CLASS["people"]);
    expect(head).not.toBe(screen.getByTestId("facet-hub"));
  });

  /**
   * Three facets, three heads. A shared string would have all three pages
   * claim the same subject, which is the confusion the switcher already has to
   * work against.
   */
  // @req REQ-114
  it("gives every facet its own eyebrow and title", () => {
    const titles = FACETS.map((facet) => facet.title);
    const eyebrows = FACETS.map((facet) => facet.eyebrow);

    expect(new Set(titles).size).toBe(FACETS.length);
    expect(new Set(eyebrows).size).toBe(FACETS.length);
    for (const eyebrow of eyebrows) {
      expect(eyebrow).toMatch(/^atlas · /);
    }
  });
});

describe("the trail — chrome at interface size, not caption size", () => {
  /**
   * The trail is the only thing naming the reader's position above the fold on
   * a facet, and it was set at caption size — 13px, the step reserved for
   * annotations under a figure. It reads at the interface step, the same one a
   * control and its label agree on.
   */
  // @req REQ-115
  it("sets the trail at the interface step", () => {
    render(
      <AfrikBreadcrumbs
        items={[{ label: "Accueil", href: "/fr" }, { label: "Peuples" }]}
      />
    );

    const list = screen.getByRole("navigation", { name: "Fil d'ariane" })
      .firstElementChild as HTMLElement;
    expect(list.className).toContain("text-afh-small");
    expect(list.className).not.toContain("text-afh-caption");
  });
});

describe("the filter hint — a caption on the controls, at the controls' width", () => {
  /**
   * The hint sat in a hand-set 62ch box while the switcher above it and the
   * filter bar below it both filled the container, so a paragraph describing
   * two full-width controls stopped at two-fifths of them and read as a column
   * someone had forgotten to finish.
   *
   * The typography charter now gives running prose no measure of its own, so
   * the question does not even arise here — and it would not have anyway: this
   * is a caption on a control row, not running prose, and it belongs with the
   * controls it describes.
   */
  // @req REQ-114
  it("gives the hint no measure of its own", () => {
    renderShell();

    expect(screen.getByTestId("facet-filter-hint").className).not.toMatch(
      /max-w-/
    );
  });

  // @req REQ-114
  it("keeps the hint in the same column as the switcher it explains", () => {
    renderShell();

    const hint = screen.getByTestId("facet-filter-hint");
    const switcher = screen.getByTestId("facet-switcher");

    expect(hint.parentElement).toBe(switcher.parentElement);
  });
});
