import { describe, expect, it } from "vitest";

import { formatYearFr } from "@/lib/atlas/formatYearFr";

describe("formatYearFr", () => {
  // @req REQ-101
  it("renders a negative year as 'N av. J.-C.'", () => {
    expect(formatYearFr(-500)).toBe("500 av. J.-C.");
  });

  // @req REQ-101
  it("renders a large negative year as 'N av. J.-C.'", () => {
    expect(formatYearFr(-3000)).toBe("3000 av. J.-C.");
  });

  // @req REQ-101
  it("renders a positive year as the bare year", () => {
    expect(formatYearFr(1200)).toBe("1200");
  });

  // @req REQ-101
  it("renders year zero as the bare year", () => {
    expect(formatYearFr(0)).toBe("0");
  });
});
