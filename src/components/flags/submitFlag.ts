import type { FlagSubmissionPayload } from "@/components/flags/FlagForm";
import { createBrowserSupabaseClient } from "@/lib/supabase/auth-client";

/**
 * Sending a report, from wherever it was written.
 *
 * Two surfaces now write one: the dialog a fiche's reading rail opens, and the
 * "Signaler une erreur" page. They differ in everything a reader can see and
 * in nothing that happens after the send button, so the send lives here rather
 * than being copied — a second copy is how one of them would quietly stop
 * attaching the session, or stop reading the public slug back.
 *
 * It deliberately does not toast, track, or close anything: those belong to
 * the surface, which is the only thing that knows whether it has a dialog to
 * close or a confirmation panel to swap in.
 */

/**
 * The session, when there is one, for attribution only.
 *
 * This used to be a gate: no session, or an account whose age was not
 * confirmed, and the dialog offered links instead of a form. Reporting now
 * costs no account (moderation charter §2), so the token is passed when it
 * exists and omitted when it does not — the API decides what to credit, and
 * accepts either way.
 */
async function currentAccessToken(): Promise<string | null> {
  const supabase = createBrowserSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token ?? null;
}

// @req REQ-012
export async function submitFlag(
  payload: FlagSubmissionPayload
): Promise<{ public_slug: string }> {
  const accessToken = await currentAccessToken();

  const response = await fetch("/api/v2/flags", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  const json = await response.json();

  if (!response.ok) {
    throw new Error(json?.errors?.[0]?.message ?? "flag submission failed");
  }

  return { public_slug: json.data.public_slug as string };
}
