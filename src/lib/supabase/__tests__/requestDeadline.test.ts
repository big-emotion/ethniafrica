import { afterEach, describe, expect, it, vi } from "vitest";

import {
  SUPABASE_REQUEST_TIMEOUT_MS,
  fetchWithDeadline,
} from "../requestDeadline";

/**
 * A host that accepts the connection and then says nothing is the failure this
 * guards against: the promise neither resolves nor rejects, so every caller
 * inherits the wait. The doubles below reject on abort, which is what the
 * platform does.
 */
function fetchThatNeverAnswers() {
  return vi.fn(
    (_input: unknown, init?: { signal?: AbortSignal }) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(new Error("aborted"))
        );
      })
  );
}

describe("supabase request deadline", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  // @req REQ-110
  it("abandons a request that never answers", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", fetchThatNeverAnswers());

    const pending = fetchWithDeadline("https://example.test/rest/v1/afrik");
    const settled = expect(pending).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(SUPABASE_REQUEST_TIMEOUT_MS);

    await settled;
  });

  // @req REQ-110
  it("leaves a request that answers in time untouched", async () => {
    const answered = new Response("[]", { status: 200 });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => answered)
    );

    await expect(
      fetchWithDeadline("https://example.test/rest/v1/afrik")
    ).resolves.toBe(answered);
  });

  // A caller's own abort — `.abortSignal()` on a Supabase query — has to keep
  // working, so the deadline composes with it rather than replacing it.
  // @req REQ-110
  it("still honours an abort signal the caller supplied", async () => {
    vi.stubGlobal("fetch", fetchThatNeverAnswers());
    const caller = new AbortController();

    const pending = fetchWithDeadline("https://example.test/rest/v1/afrik", {
      signal: caller.signal,
    });
    caller.abort();

    await expect(pending).rejects.toThrow();
  });
});
