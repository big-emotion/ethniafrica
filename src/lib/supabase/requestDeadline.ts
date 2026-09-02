/**
 * A deadline on every request the server-side Supabase clients make.
 *
 * PostgREST answering an error is a failure the readers already handle: they
 * log it and yield an empty list, so a page loses its data and still renders.
 * A host that accepts the connection and then says nothing is not that. The
 * promise never settles, `await` never returns, and the failure is inherited
 * by whatever was waiting — a page that never streams, a static export Next
 * kills after 60s, an a11y run whose every corpus-reading route times out
 * while the static ones pass.
 *
 * A deadline converts that silence back into the error case the readers were
 * already written for. It is not a fix for a slow database — it is what keeps
 * a slow database from taking the page down with it.
 */

/**
 * Ten seconds. A page of 500 ids comes back in tens of milliseconds and the
 * heaviest fiche query in hundreds, so this never fires against a healthy
 * database. It sits well under the two ceilings that matter downstream:
 * Next kills a static route at 60s, and the a11y run gives a navigation 30s.
 */
// @req REQ-110
export const SUPABASE_REQUEST_TIMEOUT_MS = 10_000;

/**
 * Two minutes, for a batch run rather than a page.
 *
 * The reasoning above holds only for a request whose answer a reader is
 * waiting on. The corpus loader is the other case: it reads whole content
 * tables — `select("id, content")` over the 37.7 MB of TOASTed JSONB in
 * `afrik_peoples` — and tens of seconds there is the job working, not a host
 * gone silent. Held to the page deadline it never finished a single sync:
 * `Failed to read afrik_language_families: AbortError`, ten seconds in, on
 * every push to `recette`.
 *
 * Widened rather than lifted. A loader that hangs forever is still a loader
 * that never reports, and the sync job would sit until the runner's own
 * six-hour ceiling — so the deadline stays, with room for the read it has to
 * make.
 */
// @req REQ-110
export const SUPABASE_BATCH_REQUEST_TIMEOUT_MS = 120_000;

/**
 * Builds a `fetch` bound to one deadline.
 *
 * The caller's own signal is composed with the deadline rather than replaced:
 * a Supabase query that carries `.abortSignal()` keeps aborting when its
 * caller says so, and now also when time runs out.
 */
// @req REQ-110
export function createFetchWithDeadline(
  timeoutMs: number
): (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> {
  return async function fetchBeforeDeadline(input, init) {
    const overdue = new AbortController();
    const timer = setTimeout(() => overdue.abort(), timeoutMs);

    const signal = init?.signal
      ? AbortSignal.any([init.signal, overdue.signal])
      : overdue.signal;

    try {
      return await fetch(input, { ...init, signal });
    } finally {
      clearTimeout(timer);
    }
  };
}

/**
 * `fetch`, with the page deadline applied. What every server client uses
 * unless it says otherwise.
 */
// @req REQ-110
export const fetchWithDeadline = createFetchWithDeadline(
  SUPABASE_REQUEST_TIMEOUT_MS
);
