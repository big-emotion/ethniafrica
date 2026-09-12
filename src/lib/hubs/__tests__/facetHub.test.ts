import { describe, expect, it } from "vitest";

import { buildFacetCountryIndex, readFacet } from "@/lib/hubs/facetHub";

const rows = [
  { id: "PPL_AKAN", name: "Akan", countryIds: ["GHA", "CIV"] },
  { id: "PPL_EWE", name: "Ewe", countryIds: ["GHA", "TGO"] },
];

describe("buildFacetCountryIndex", () => {
  // @req REQ-117
  it("lists under each country the rows the selection places there", () => {
    const { index } = buildFacetCountryIndex(rows, {
      label: (row) => row.name,
      href: (row) => `/fiche/${row.id}`,
      narrowHref: (countryId) => `/facet?pays=${countryId}`,
    });

    expect(index.GHA).toEqual([
      { id: "PPL_AKAN", label: "Akan", href: "/fiche/PPL_AKAN" },
      { id: "PPL_EWE", label: "Ewe", href: "/fiche/PPL_EWE" },
    ]);
    expect(index.TGO).toEqual([
      { id: "PPL_EWE", label: "Ewe", href: "/fiche/PPL_EWE" },
    ]);
  });

  // A country is addressable exactly when the selection reaches it, so the
  // map can never offer a narrowing that lands on an empty list.
  // @req REQ-117
  it("offers a narrowing for every indexed country, and only those", () => {
    const { index, narrowing } = buildFacetCountryIndex(rows, {
      label: (row) => row.name,
      href: (row) => `/fiche/${row.id}`,
      narrowHref: (countryId) => `/facet?pays=${countryId}`,
    });

    expect(Object.keys(narrowing).sort()).toEqual(Object.keys(index).sort());
    expect(narrowing.CIV).toBe("/facet?pays=CIV");
  });
});

describe("readFacet", () => {
  // @req REQ-139
  it("hands back what the reads return", async () => {
    await expect(readFacet(async () => 42)).resolves.toBe(42);
  });

  // Zero is a valid total; a failed read is not. A hub that rendered its
  // fallback values would state an empty corpus that nobody measured.
  // @req REQ-139
  it("reports a failed read as unavailable rather than as an empty reading", async () => {
    await expect(
      readFacet(async () => {
        throw new Error("database unavailable");
      })
    ).resolves.toBeNull();
  });
});
