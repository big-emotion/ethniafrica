import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FacetFilterBar } from "@/components/hubs/facets/FacetFilterBar";
import { FacetGlobeIsland } from "@/components/hubs/facets/FacetGlobeIsland";
import { FacetSwitcher } from "@/components/hubs/facets/FacetSwitcher";
import { DIRECTORY_ACCENT_CLASS } from "@/lib/hubs/directoryAccent";
import {
  FACETS,
  definedFilter,
  getFacetFromRoute,
  getFacetRoute,
} from "@/lib/hubs/facets";
import { getLocalizedRoute, getPageFromRoute } from "@/lib/routing";

/**
 * The contract the three facets share.
 *
 * PR4, PR5 and PR6 build one facet each, in parallel, on top of this shell.
 * What a parallel build gets wrong is never the facet — it is the seam: three
 * worktrees each invent a switcher, an accent scope and a globe, and the
 * result is three half-designs that each look finished alone. These are the
 * assertions that make the seam a thing a build can check.
 */
describe("facet hub charter — the seam the three facets share", () => {
  // @req REQ-114
  it("addresses every facet through the slug table, never a typed path", () => {
    for (const facet of FACETS) {
      expect(getFacetRoute("fr", facet.key)).toBe(
        getLocalizedRoute("fr", facet.page)
      );
    }
  });

  // @req REQ-114
  it("round-trips a facet through its own address", () => {
    for (const facet of FACETS) {
      expect(getFacetFromRoute(getFacetRoute("fr", facet.key))).toBe(facet.key);
    }
  });

  /**
   * The one that stops the fiches inheriting the hub. `getPageFromRoute`
   * answers "peoples" for a fiche as well, so a prefix test in the shell would
   * hand every fiche a second globe and a facet switcher.
   */
  // @req REQ-114
  it("does not claim a fiche as a facet, though the fiche shares its prefix", () => {
    for (const facet of FACETS) {
      const fiche = `${getFacetRoute("fr", facet.key)}/SOME_ID`;
      expect(getPageFromRoute(fiche)).toBe(facet.page);
      expect(getFacetFromRoute(fiche)).toBeNull();
    }
  });

  // @req REQ-114
  it("claims neither the Explorer hub itself nor its search", () => {
    expect(getFacetFromRoute(getLocalizedRoute("fr", "atlasHub"))).toBeNull();
    expect(getFacetFromRoute(getLocalizedRoute("fr", "search"))).toBeNull();
  });

  /**
   * Three facets, three hues, and none of them chosen here: the directory
   * accents were already decided, so a facet that picked its own would put a
   * second answer in the codebase.
   */
  // @req REQ-114
  it("takes each facet's accent from the directory scale, distinctly", () => {
    const accents = FACETS.map(
      (facet) => DIRECTORY_ACCENT_CLASS[facet.entityType]
    );
    expect(new Set(accents).size).toBe(FACETS.length);
    for (const accent of accents) {
      expect(accent).toMatch(/^afh-accent-/);
    }
  });

  /**
   * The facet and the filters collide in the reader's language — "pays" names
   * one of each — so every facet has to say which is which in its own terms.
   * A shared sentence could not: "filtrer par pays" means a different thing on
   * each facet, which is the confusion rather than the cure.
   */
  // @req REQ-114
  it("has every facet distinguish itself from its filters, in its own words", () => {
    const hints = FACETS.map((facet) => facet.filterHint);

    expect(new Set(hints).size).toBe(FACETS.length);
    for (const hint of hints) {
      expect(hint.length).toBeGreaterThan(40);
      expect(hint).toMatch(/filtr/i);
    }
  });

  // @req REQ-114
  it("reads an unset native select as no filter rather than as a value", () => {
    expect(definedFilter("")).toBeNull();
    expect(definedFilter("   ")).toBeNull();
    expect(definedFilter(undefined)).toBeNull();
    expect(definedFilter("BEN")).toBe("BEN");
    expect(definedFilter(["BEN", "TGO"])).toBe("BEN");
  });

  /**
   * No `__all__`. The sentinel exists in the search surface only because a
   * shadcn `SelectItem` may not carry an empty value; a native `<option>` may,
   * so the workaround must not travel with the shape.
   */
  // @req REQ-114
  it("treats no sentinel string as meaning 'everything'", () => {
    expect(definedFilter("__all__")).toBe("__all__");
  });
});

describe("facet band — a fixed band, never an aspect ratio", () => {
  /**
   * The band is full-bleed, so an `aspect-ratio` box takes its height from the
   * *viewport* width: at 1512px it asked for 1433px and the reader met a wall
   * of night with the map below the fold. Measured on the deployed recette
   * before the fix — 1433px against a 520px token.
   *
   * space.css already carries that lesson for the fiche band, so the assertion
   * is that this band reads the same token rather than a number of its own.
   */
  // @req REQ-116
  it("takes its height from the shared stage token, and declares no aspect ratio", () => {
    render(
      <FacetGlobeIsland
        peopleCountsByCountry={undefined}
        countryIds={[]}
        missingMessage="rien"
      />
    );

    const band = screen.getByTestId("facet-globe-island");
    expect(band.style.height).toBe("var(--afh-globe-stage-height)");
    expect(band.style.aspectRatio).toBe("");
  });
});

describe("facet switcher — plain anchors, not a widget", () => {
  /**
   * The switcher and the hub's module list are two renderings of one running
   * order, and a reader crossing from one to the other reads them as the same
   * set. They drifted apart once already — the hub listed four modules in one
   * order while the switcher walked three facets in another — so the order is
   * asserted where the reader meets it rather than only in the table.
   *
   * Nom sits last because it is the axis that cuts across the other four: a
   * name is carried by peoples, attested in countries, and belongs to no rung
   * of famille → langue → peuple → pays.
   */
  // @req REQ-114
  it("runs the corpus hierarchy, then the axis that cuts across it", () => {
    render(<FacetSwitcher active="peoples" />);

    const labels = screen
      .getAllByRole("link")
      .map((link) => link.textContent?.trim());
    expect(labels).toEqual(["Familles", "Langues", "Peuples", "Pays", "Nom"]);
  });

  // @req REQ-114
  it("offers all three facets as links, whichever one is being read", () => {
    render(<FacetSwitcher active="peoples" />);

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(FACETS.length);
    for (const facet of FACETS) {
      expect(screen.getByRole("link", { name: facet.label })).toHaveAttribute(
        "href",
        getFacetRoute("fr", facet.key)
      );
    }
  });

  // @req REQ-114
  it("marks the facet being read, and leaves it a link", () => {
    render(<FacetSwitcher active="families" />);

    const current = screen.getByRole("link", { name: "Familles" });
    expect(current).toHaveAttribute("aria-current", "page");
    expect(current).toHaveAttribute("href", getFacetRoute("fr", "families"));

    expect(screen.getByRole("link", { name: "Peuples" })).not.toHaveAttribute(
      "aria-current"
    );
  });

  /**
   * Every facet the switcher offers must resolve — the same rule
   * `navigationCharter` holds the header to, applied one level down.
   */
  // @req REQ-114
  it("offers no facet whose address does not resolve", () => {
    render(<FacetSwitcher active="countries" />);

    for (const link of screen.getAllByRole("link")) {
      const href = link.getAttribute("href") ?? "";
      expect(getPageFromRoute(href)).not.toBeNull();
    }
  });
});

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

/**
 * A `GET` form submits the controls it contains and nothing else, so anything
 * the reader has already chosen outside the bar — the page size, the letter —
 * is dropped the moment they narrow. Hidden fields are how a form carries
 * state it does not itself edit.
 */
describe("facet filter bar — the state it carries but does not edit", () => {
  // @req REQ-114
  it("carries a hidden field through a submit", () => {
    render(
      <FacetFilterBar
        action={getFacetRoute("fr", "peoples")}
        preservedParams={{ taille: "100" }}
        primaryField={{
          name: "famille",
          label: "Famille linguistique",
          anyLabel: "Toutes les familles",
          options: [{ value: "FLG_NC", label: "Niger-Congo" }],
          value: null,
        }}
      />
    );
    const carried = document.querySelector('input[name="taille"]');
    expect(carried).toHaveAttribute("type", "hidden");
    expect(carried).toHaveAttribute("value", "100");
  });

  /** Nothing to carry must mean no field, not an empty one the form submits. */
  // @req REQ-114
  it("emits no field for a value the reader has not set", () => {
    render(
      <FacetFilterBar
        action={getFacetRoute("fr", "peoples")}
        preservedParams={{ taille: undefined }}
        primaryField={{
          name: "famille",
          label: "Famille linguistique",
          anyLabel: "Toutes les familles",
          options: [],
          value: null,
        }}
      />
    );
    expect(document.querySelector('input[name="taille"]')).toBeNull();
  });
});
