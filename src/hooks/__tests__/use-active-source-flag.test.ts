import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockHasActiveSourceFlag } = vi.hoisted(() => ({
  mockHasActiveSourceFlag: vi.fn(),
}));

vi.mock("@/lib/flags-client", () => ({
  hasActiveSourceFlag: (...args: unknown[]) => mockHasActiveSourceFlag(...args),
}));

import { useActiveSourceFlag } from "../use-active-source-flag";

describe("useActiveSourceFlag", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasActiveSourceFlag.mockResolvedValue(false);
  });

  // @req REQ-031
  it("does not query without a selected entity", () => {
    const { result } = renderHook(() => useActiveSourceFlag("country", null));

    expect(result.current).toBe(false);
    expect(mockHasActiveSourceFlag).not.toHaveBeenCalled();
  });

  // @req REQ-031
  it("returns the active flag for the current entity", async () => {
    mockHasActiveSourceFlag.mockResolvedValueOnce(true);
    const { result } = renderHook(() =>
      useActiveSourceFlag("people", "PPL_WOLOF")
    );

    await waitFor(() => expect(result.current).toBe(true));
    expect(mockHasActiveSourceFlag).toHaveBeenCalledWith("people", "PPL_WOLOF");
  });
});
