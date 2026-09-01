import { describe, it, expect } from "vitest";
import { loadPeople } from "../peopleLoader";

/**
 * REQ-002 already requires alternate-spelling search; DEC-034 (ETNI-1408)
 * built the DB column, search_vector weighting and loader mapping. What was
 * still missing was the editorial data itself: no fiche declared a
 * spelling_aliases value, so the search path had nothing to match against.
 * These tests pin the two acceptance-case fiches (ETNI-1417).
 */
describe("REQ-002 alternate-spelling aliases (ETNI-1417)", () => {
  // @req REQ-002
  it('declares "Gour" as a spelling alias on the Gur peoples fiche', async () => {
    const result = await loadPeople("PPL_GUR_MACRO");

    expect(result.success).toBe(true);
    expect(result.data?.content.appellations?.spellingAliases).toContain(
      "Gour"
    );
  });

  // @req REQ-002
  it('declares "Bt" as a spelling alias on the Bété fiche', async () => {
    const result = await loadPeople("PPL_BETE");

    expect(result.success).toBe(true);
    expect(result.data?.content.appellations?.spellingAliases).toContain("Bt");
  });
});
