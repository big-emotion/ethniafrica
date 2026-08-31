import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  FacetFilterBar,
  type FacetFilterField,
} from "@/components/hubs/facets/FacetFilterBar";
import { getFacetRoute } from "@/lib/hubs/facets";

/**
 * What the filter bar owes the reader, on a phone.
 *
 * The bar it replaces stacked every narrowing at full width: on a 430px
 * viewport that was a 248px card, and the A-Z rail below it wrapped over four
 * rows for another 188px — some 558px of controls between the count and the
 * first fiche, after a globe that had already taken a screen. A hub whose
 * first fiche sits 1.4 screens down is a hub nobody reaches.
 *
 * So the facet's own axis stays on the line and the rest folds away. The fold
 * is the part with a rule attached: the atlas charter (§3) allows a surface to
 * nest what it offers and forbids it to hide it, and settles the difference on
 * the count -- "a shelf carries its count, so nothing is asserted absent".
 * A disclosure that swallowed a country filter without saying it held one
 * would leave a reader looking at 40 peoples out of 803 with nothing on screen
 * accounting for the gap.
 */

const FAMILY: FacetFilterField = {
  name: "famille",
  label: "Famille linguistique",
  anyLabel: "Toutes les familles",
  options: [
    { value: "FLG_NIGER_CONGO", label: "Niger-Congo" },
    { value: "FLG_AFRO_ASIATIQUE", label: "Afro-asiatique" },
  ],
  value: null,
};

const COUNTRY: FacetFilterField = {
  name: "pays",
  label: "Pays",
  anyLabel: "Tous les pays",
  options: [
    { value: "GHA", label: "Ghana" },
    { value: "BDI", label: "Burundi" },
  ],
  value: null,
};

const PEUPLES = getFacetRoute("fr", "peoples");
const FAMILLES = getFacetRoute("fr", "families");

const advanced = () => screen.getByTestId("facet-filter-advanced");

describe("the facet filter bar — one line, and a fold", () => {
  // @req REQ-114
  it("keeps the facet's own axis on the line, outside the fold", () => {
    render(
      <FacetFilterBar
        action={PEUPLES}
        primaryField={FAMILY}
        advancedFields={[COUNTRY]}
      />
    );

    const primary = screen.getByLabelText("Famille linguistique");
    expect(primary).toBeInTheDocument();
    expect(advanced().contains(primary)).toBe(false);
  });

  // @req REQ-114
  it("folds the secondary narrowings away, closed on arrival", () => {
    render(
      <FacetFilterBar
        action={PEUPLES}
        primaryField={FAMILY}
        advancedFields={[COUNTRY]}
      />
    );

    expect(advanced()).not.toHaveAttribute("open");
    expect(advanced().contains(screen.getByLabelText("Pays"))).toBe(true);
  });

  /**
   * The count is the whole licence to fold. Without it the reader is shown a
   * narrowed list and a control that says nothing about narrowing it.
   */
  // @req REQ-114
  it("names how many narrowings the fold is holding", () => {
    render(
      <FacetFilterBar
        action={PEUPLES}
        primaryField={FAMILY}
        advancedFields={[{ ...COUNTRY, value: "GHA" }]}
      />
    );

    expect(within(advanced()).getByText(/filtres/i).textContent).toContain("1");
  });

  // @req REQ-114
  it("counts nothing when no secondary narrowing is set", () => {
    render(
      <FacetFilterBar
        action={PEUPLES}
        primaryField={FAMILY}
        advancedFields={[COUNTRY]}
      />
    );

    expect(within(advanced()).getByText(/filtres/i).textContent).not.toMatch(
      /\d/
    );
  });

  /**
   * A fold offering nothing is a control that costs a tap and answers no
   * question. The families facet has one filter and must not grow a lid.
   */
  // @req REQ-114
  it("grows no fold when the facet has only its own axis", () => {
    render(<FacetFilterBar action={FAMILLES} primaryField={COUNTRY} />);

    expect(screen.queryByTestId("facet-filter-advanced")).toBeNull();
  });

  /**
   * The defect this closes: the bar submitted only the fields it rendered, so
   * a reader reading the peoples of "K" who then chose a family was silently
   * returned the whole alphabet. A GET form carries what it holds -- so it has
   * to hold the narrowings it does not own.
   */
  // @req REQ-114
  it("carries the narrowings it does not own, so applying one keeps the others", () => {
    const { container } = render(
      <FacetFilterBar
        action={PEUPLES}
        primaryField={FAMILY}
        preservedParams={{ lettre: "K", page: null }}
      />
    );

    const hidden = [
      ...container.querySelectorAll<HTMLInputElement>('input[type="hidden"]'),
    ];
    expect(hidden.map((input) => [input.name, input.value])).toEqual([
      ["lettre", "K"],
    ]);
  });

  /**
   * Paging is deliberately not preserved: a new narrowing opens on its first
   * page, and carrying page 4 into a smaller set offers a page that cannot
   * exist.
   */
  // @req REQ-114
  it("drops a page number rather than carrying it into a narrower set", () => {
    const { container } = render(
      <FacetFilterBar
        action={PEUPLES}
        primaryField={FAMILY}
        preservedParams={{ page: "4" }}
      />
    );

    expect(container.querySelector('input[name="page"]')).toBeNull();
  });

  /**
   * The chips are what the fold owes back. They are anchors rather than
   * buttons for the same reason the A-Z rail is: a narrowing is a reading of
   * the corpus, so removing one has an address.
   */
  // @req REQ-114
  it("offers each applied narrowing as an address that removes it", () => {
    render(
      <FacetFilterBar
        action={PEUPLES}
        primaryField={FAMILY}
        advancedFields={[{ ...COUNTRY, value: "BDI" }]}
        activeFilters={[{ label: "Pays : Burundi", removeHref: PEUPLES }]}
      />
    );

    const chip = screen.getByRole("link", { name: /retirer.*burundi/i });
    expect(chip).toHaveAttribute("href", PEUPLES);
  });

  // @req REQ-114
  it("shows no chip row when nothing is applied", () => {
    render(<FacetFilterBar action={PEUPLES} primaryField={FAMILY} />);

    expect(screen.queryByTestId("facet-active-filters")).toBeNull();
  });

  /**
   * The A-Z rail is 27 anchors, not a form field, so it rides in the fold as
   * content -- and still counts toward the badge, because to the reader it is
   * one more narrowing they cannot see.
   */
  // @req REQ-114
  it("folds a narrowing that is not a form field, and still counts it", () => {
    render(
      <FacetFilterBar
        action={PEUPLES}
        primaryField={FAMILY}
        advancedSlot={{
          content: <a href="#K">K</a>,
          activeCount: 1,
        }}
      />
    );

    expect(advanced().contains(screen.getByRole("link", { name: "K" }))).toBe(
      true
    );
    expect(within(advanced()).getByText(/filtres/i).textContent).toContain("1");
  });

  // @req REQ-114
  it("submits to the facet's own address, as a GET a crawler can follow", () => {
    render(<FacetFilterBar action={PEUPLES} primaryField={FAMILY} />);

    const form = screen.getByTestId("facet-filter-bar");
    expect(form).toHaveAttribute("method", "get");
    expect(form).toHaveAttribute("action", PEUPLES);
  });
});
