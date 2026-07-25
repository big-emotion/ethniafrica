import { beforeEach, describe, expect, it, vi } from "vitest";

const { getPublicFlagsPageMock, isValidPublicFlagsCursorMock } = vi.hoisted(
  () => ({
    getPublicFlagsPageMock: vi.fn(),
    isValidPublicFlagsCursorMock: vi.fn(
      (cursor: string) => cursor !== "malicious-filter-grammar"
    ),
  })
);

vi.mock("@/lib/supabase/queries/flags/getPublicFlagsPage", () => ({
  getPublicFlagsPage: (...args: unknown[]) => getPublicFlagsPageMock(...args),
  isValidPublicFlagsCursor: (...args: [string]) =>
    isValidPublicFlagsCursorMock(...args),
}));

import { loadPublicFlagsPage } from "../actions";

describe("loadPublicFlagsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isValidPublicFlagsCursorMock.mockImplementation(
      (cursor: string) => cursor !== "malicious-filter-grammar"
    );
    getPublicFlagsPageMock.mockResolvedValue({ items: [], nextCursor: null });
  });

  // @req REQ-014
  it("whitelists public filters before executing the server-side query", async () => {
    const validCursor = btoa(
      JSON.stringify({
        createdAt: "2026-07-24T12:00:00.000Z",
        id: "00000000-0000-0000-0000-000000000001",
      })
    );

    await loadPublicFlagsPage({
      statuses: ["open", "not-a-status"] as never,
      kinds: ["other", "not-a-kind"] as never,
      targetTypes: ["assertion", "malicious),id.not.is.null"] as never,
      cursor: validCursor,
      pageSize: 500,
    });

    expect(getPublicFlagsPageMock).toHaveBeenCalledWith({
      statuses: ["open"],
      kinds: ["other"],
      targetTypes: ["assertion"],
      cursor: validCursor,
      pageSize: 50,
    });
  });

  // @req REQ-014
  it("drops a forged cursor before it reaches the query layer", async () => {
    await loadPublicFlagsPage({ cursor: "malicious-filter-grammar" });

    expect(getPublicFlagsPageMock).toHaveBeenCalledWith(
      expect.objectContaining({ cursor: undefined })
    );
  });
});
