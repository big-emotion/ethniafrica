import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../services/doctrine", () => ({
  listDoctrine: vi.fn(),
}));

import { listDoctrine } from "../../services/doctrine";
import { listDoctrineHandler } from "../doctrine";

describe("doctrine handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the canonical envelope with the doctrine list", async () => {
    const entries = [
      {
        slug: "review_policy" as const,
        title: "Review policy",
        mdxSource: "# Review",
        version: 3,
        publishedAt: "2026-04-01T00:00:00.000Z",
      },
    ];
    vi.mocked(listDoctrine).mockResolvedValue(entries);

    const envelope = await listDoctrineHandler();

    expect(envelope.data).toEqual(entries);
    expect(envelope.meta.license).toBe("CC-BY-SA-4.0");
    expect(envelope.errors).toEqual([]);
  });
});
