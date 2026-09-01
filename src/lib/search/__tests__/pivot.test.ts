import { describe, expect, it } from "vitest";

import { selectPivot } from "../pivot";
import type { SearchResult } from "@/types/afrik-frontend";

function people(
  id: string,
  name: string,
  relevance: number,
  extra: Partial<SearchResult> = {}
): SearchResult {
  return { type: "people", id, name, relevance, ...extra };
}

describe("selectPivot", () => {
  // @req REQ-002
  it("selects the head when its name matches the query ignoring accents and case", () => {
    const results = [people("PPL_BETE", "Bété", 0.8), people("X", "Béti", 0.7)];
    expect(selectPivot(results, "bete")?.id).toBe("PPL_BETE");
  });

  // @req REQ-002
  it("selects the head when its relevance at least doubles the runner-up's", () => {
    const results = [people("A", "Krou", 0.9), people("B", "Kru", 0.4)];
    expect(selectPivot(results, "peuple forestier")?.id).toBe("A");
  });

  // @req REQ-002
  it("selects nothing when the top two hits are close", () => {
    const results = [people("A", "Béti", 0.8), people("B", "Bété", 0.7)];
    expect(selectPivot(results, "bet")).toBeNull();
  });

  // @req REQ-124
  // @req REQ-002
  it("selects nothing when another result shares the head's normalized name", () => {
    const results = [people("A", "Bété", 0.9), people("B", "BETE", 0.1)];
    expect(selectPivot(results, "bété")).toBeNull();
  });

  // @req REQ-002
  it("selects nothing from an empty result list", () => {
    expect(selectPivot([], "bété")).toBeNull();
  });

  // @req REQ-002
  it("selects nothing when the query is blank", () => {
    expect(selectPivot([people("A", "Bété", 0.9)], "   ")).toBeNull();
  });

  // @req REQ-002
  it("selects the sole result when it matches the query exactly", () => {
    expect(selectPivot([people("A", "Bété", 0.9)], "Bété")?.id).toBe("A");
  });

  // @req REQ-002
  it("selects nothing when the sole result neither matches nor stands out", () => {
    expect(selectPivot([people("A", "Amhara", 0.05)], "bété")).toBeNull();
  });
});
