import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ApiDocsPage from "@/app/docs/api/page";
import { swaggerSpecV2 } from "@/lib/api/openapiV2";
import { apiTagLabel } from "@/lib/api/openapiV2Tags";
import { PRODUCT_NAME } from "@/lib/brand";

/**
 * The served spec, not the module the page reads.
 *
 * Holding the page against `openapiV2Tags` would only prove the page can read
 * its own import. What the reader is owed is that the landing page and the
 * document `/api/docs/v2` serves describe the same API — so the expectation is
 * taken from the spec swagger-jsdoc actually builds.
 */
const servedTags = (swaggerSpecV2 as { tags?: { name: string }[] }).tags ?? [];

describe("the API landing page", () => {
  // This page said "Accès aux pays, peuples, familles linguistiques et
  // recherche" for a year while the spec grew to eighteen tags, because it
  // restated the coverage instead of reading it. The list is derived now, and
  // this is the gate that keeps it derived: a hand-written list would have to
  // be updated in two places to pass, which is the point.
  // @req REQ-099
  it("names every resource family the served spec declares", () => {
    render(<ApiDocsPage />);

    const coverage = screen.getByTestId("api-v2-coverage");

    expect(servedTags.length).toBeGreaterThan(0);
    for (const { name } of servedTags) {
      expect(within(coverage).getByText(apiTagLabel(name))).toBeInTheDocument();
    }
  });

  // @req REQ-099
  it("claims no resource family the spec does not declare", () => {
    render(<ApiDocsPage />);

    const declared = servedTags.map((tag) => apiTagLabel(tag.name));
    const shown = Array.from(
      screen.getByTestId("api-v2-coverage").children
    ).map((pill) => pill.textContent);

    expect(shown).toEqual(declared);
  });

  // @req REQ-099
  it("calls the product by its own name", () => {
    render(<ApiDocsPage />);

    expect(screen.queryAllByText(/Ethniafrique/i)).toHaveLength(0);
    expect(
      screen.queryAllByText(new RegExp(PRODUCT_NAME, "i")).length
    ).toBeGreaterThan(0);
  });
});
