// Supabase Edge Function: cache-invalidate
// Story: ETNI-47 [3.3]
//
// Triggered by a Supabase database webhook on revisions INSERT.
// Bridges the pg_notify 'cache_invalidate' event to the Next.js
// POST /api/internal/revalidate endpoint so live fiche page caches
// are invalidated within the 10-second SLA (AR16, AR18).
//
// Required environment variables (set in Supabase dashboard):
//   NEXT_PUBLIC_APP_URL       — base URL of the Next.js app (no trailing slash)
//   SUPABASE_WEBHOOK_SECRET   — shared secret for the revalidate endpoint

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

interface RevisionRecord {
  entity_type: string;
  entity_id: string;
  [key: string]: unknown;
}

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: RevisionRecord;
  old_record: RevisionRecord | null;
}

serve(async (req: Request) => {
  try {
    const payload: WebhookPayload = await req.json();

    // Only process INSERT events on the revisions table
    if (payload.type !== "INSERT" || payload.table !== "revisions") {
      return jsonResponse({ skipped: true, reason: "not a revisions INSERT" });
    }

    const { entity_type, entity_id } = payload.record;
    // slug mirrors the trigger: LOWER(entity_id)
    const slug = entity_id.toLowerCase();

    const appUrl = Deno.env.get("NEXT_PUBLIC_APP_URL");
    const webhookSecret = Deno.env.get("SUPABASE_WEBHOOK_SECRET");

    if (!appUrl || !webhookSecret) {
      console.error(
        "[cache-invalidate] Missing env vars: NEXT_PUBLIC_APP_URL or SUPABASE_WEBHOOK_SECRET"
      );
      return jsonResponse({ error: "Edge Function misconfigured" }, 500);
    }

    const revalidateUrl = `${appUrl}/api/internal/revalidate`;

    const res = await fetch(revalidateUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${webhookSecret}`,
      },
      body: JSON.stringify({ entity_type, entity_id, slug }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[cache-invalidate] Revalidate call failed", {
        status: res.status,
        body: text,
      });
      return jsonResponse(
        { error: "Revalidate call failed", status: res.status },
        502
      );
    }

    const result = await res.json();
    return jsonResponse({ success: true, ...result });
  } catch (err) {
    console.error("[cache-invalidate] Unexpected error", err);
    return jsonResponse({ error: "Unexpected error" }, 500);
  }
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
