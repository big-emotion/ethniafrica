import { afterEach, describe, expect, it, vi } from "vitest";

import {
  SUPABASE_BATCH_REQUEST_TIMEOUT_MS,
  SUPABASE_REQUEST_TIMEOUT_MS,
  createFetchWithDeadline,
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

/**
 * The corpus loader reads whole content tables — `select("id, content")` over
 * 37.7 MB of TOASTed JSONB in `afrik_peoples` alone. That is a legitimate read
 * measured in tens of seconds, not a host gone silent, and the page deadline
 * cancelled it ten seconds in: `Failed to read afrik_language_families:
 * AbortError`, every recette sync, so the corpus stopped reaching the database.
 *
 * A batch run still needs *a* deadline — a hang is no better here than on a
 * page — so the fix widens it rather than removing it.
 */
describe("batch request deadline", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  // @req REQ-110
  it("gives a batch read more time than a page render gets", () => {
    expect(SUPABASE_BATCH_REQUEST_TIMEOUT_MS).toBeGreaterThan(
      SUPABASE_REQUEST_TIMEOUT_MS
    );
  });

  // @req REQ-110
  it("lets a read outlive the page deadline", async () => {
    vi.useFakeTimers();
    const answered = new Response("[]", { status: 200 });
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_input: unknown, init?: { signal?: AbortSignal }) =>
          new Promise((resolve, reject) => {
            init?.signal?.addEventListener("abort", () =>
              reject(new Error("aborted"))
            );
            setTimeout(
              () => resolve(answered),
              SUPABASE_REQUEST_TIMEOUT_MS * 3
            );
          })
      )
    );

    const pending = createFetchWithDeadline(SUPABASE_BATCH_REQUEST_TIMEOUT_MS)(
      "https://example.test/rest/v1/afrik_peoples"
    );
    await vi.advanceTimersByTimeAsync(SUPABASE_REQUEST_TIMEOUT_MS * 3);

    await expect(pending).resolves.toBe(answered);
  });

  // Widened, not removed: a host that never answers must still be abandoned.
  // @req REQ-110
  it("still abandons a batch read that never answers", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", fetchThatNeverAnswers());

    const pending = createFetchWithDeadline(SUPABASE_BATCH_REQUEST_TIMEOUT_MS)(
      "https://example.test/rest/v1/afrik_peoples"
    );
    const settled = expect(pending).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(SUPABASE_BATCH_REQUEST_TIMEOUT_MS);

    await settled;
  });
});
