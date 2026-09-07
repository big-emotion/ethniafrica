import { describe, expect, it } from "vitest";

import { CANONICAL_DOMAIN } from "@/lib/brand";
import { buildFicheJsonLd } from "@/lib/seo/ficheJsonLd";
import type { FicheSubject } from "@/lib/seo/ficheMetadata";

/**
 * What the fiche tells a machine that is not a browser.
 *
 * Measured on production 2026-09-07: zero structured data on any fiche. The
 * corpus is a graph — family → language → people → country — and none of it
 * was declared, so a search engine saw 3 242 unrelated documents and an
 * assistant had nothing to cite. `fiche-seo-baseline.test.ts` asserted the
 * absence deliberately, so that adding this would be a decision.
 */

const SUBJECT: FicheSubject = {
  name: "Fon",
  familyName: "Gbe",
  countryNames: ["Bénin", "Togo"],
};

const URL = `https://${CANONICAL_DOMAIN}/fr/atlas/peuples/PPL_FON`;

describe("buildFicheJsonLd", () => {
  // @req REQ-091
  it("declares the fiche at its canonical address", () => {
    const [entity] = buildFicheJsonLd("people", "fr", SUBJECT, URL);
    expect(entity["@id"]).toBe(URL);
    expect(entity.url).toBe(URL);
    expect(entity.name).toBe("Fon");
  });

  /**
   * A people is not an `Article` and not a `Person`. It is a term the atlas
   * defines, which is what `DefinedTerm` says and the only type that does not
   * overclaim — a fiche is a sourced record, not an authored essay.
   */
  // @req REQ-091
  it("types each kind as what it actually is", () => {
    const kinds = {
      people: "DefinedTerm",
      family: "DefinedTerm",
      name: "DefinedTerm",
      language: "Language",
      country: "Country",
    } as const;

    for (const [kind, type] of Object.entries(kinds)) {
      const [entity] = buildFicheJsonLd(
        kind as keyof typeof kinds,
        "fr",
        SUBJECT,
        URL
      );
      expect(entity["@type"], kind).toBe(type);
    }
  });

  // @req REQ-091
  it("places every fiche in the atlas as its defining set", () => {
    const [entity] = buildFicheJsonLd("people", "fr", SUBJECT, URL);
    expect(entity.inDefinedTermSet).toEqual(
      expect.objectContaining({ "@type": "DefinedTermSet" })
    );
  });

  // @req REQ-091
  it("emits a breadcrumb that climbs to the atlas hub", () => {
    const graph = buildFicheJsonLd("people", "fr", SUBJECT, URL);
    const crumbs = graph.find((node) => node["@type"] === "BreadcrumbList");
    expect(crumbs).toBeDefined();

    const positions = (
      crumbs?.itemListElement as Array<{ position: number; name: string }>
    ).map((item) => item.position);
    expect(positions).toEqual([1, 2, 3]);
  });

  /**
   * The register governs the prose, not the address. `@id` and `url` must stay
   * the fiche's real canonical, identifier and all — a graph that pointed
   * somewhere else would be worse than one that reads awkwardly. Until slugs
   * become readable the address carries `PPL_FON`, and that is the address.
   * What must not leak is a name or a description.
   */
  // @req REQ-091
  it("keeps corpus identifiers out of the graph's prose", () => {
    const graph = buildFicheJsonLd(
      "people",
      "fr",
      {
        name: "PPL_FON",
        familyName: "FLG_GBE",
        summary: "PPL_FON, un peuple.",
      },
      URL
    );

    const prose = graph.flatMap((node) => [
      node.name,
      node.description,
      ...(
        (node.itemListElement as Array<{ name?: string }> | undefined) ?? []
      ).map((item) => item.name),
    ]);

    for (const text of prose) {
      if (typeof text === "string")
        expect(text).not.toMatch(/\b(PPL|FLG|PAT)_/);
    }
    expect(graph[0]["@id"]).toBe(URL);
  });

  // @req REQ-091
  it("omits a relation the corpus does not fill rather than emitting it empty", () => {
    const [entity] = buildFicheJsonLd("people", "fr", { name: "Dei" }, URL);
    expect(entity).not.toHaveProperty("containedInPlace");
    expect(entity.name).toBe("Dei");
  });
});
