import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../services/confidence", () => ({
  getConfidenceFor: vi.fn(),
}));

import { getConfidenceFor } from "../../services/confidence";
import { getConfidenceHandler } from "../confidence";

describe("confidence handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the envelope with confidence on meta", async () => {
    vi.mocked(getConfidenceFor).mockResolvedValue({
      entityType: "people",
      entityId: "PPL_SHONA",
      score: 73,
      sourceCount: 4,
      avgSourceQuality: 0.81,
      lastHumanAuditAt: "2026-03-12T00:00:00.000Z",
      openFlagCount: 0,
      recomputedAt: "2026-05-01T00:00:00.000Z",
    });

    const envelope = await getConfidenceHandler("people", "PPL_SHONA");

    expect(getConfidenceFor).toHaveBeenCalledWith("people", "PPL_SHONA");
    expect(envelope?.data).toMatchObject({
      score: 73,
      sourceCount: 4,
      avgSourceQuality: 0.81,
      lastHumanAuditAt: "2026-03-12T00:00:00.000Z",
      openFlagCount: 0,
      recomputedAt: "2026-05-01T00:00:00.000Z",
    });
    expect(envelope?.meta.license).toBe("CC-BY-SA-4.0");
    expect(envelope?.meta.confidence).toBe(73);
    expect(envelope?.errors).toEqual([]);
  });

  it("returns null when no confidence row exists", async () => {
    vi.mocked(getConfidenceFor).mockResolvedValue(null);

    const envelope = await getConfidenceHandler("people", "PPL_UNKNOWN");

    expect(envelope).toBeNull();
  });
});
