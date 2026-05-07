/**
 * API Key Authentication
 * Validates API keys against the api_keys table (migration 011/012)
 *
 * Keys are stored as SHA-256 hashes. Raw keys are never stored.
 */
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Hash a raw API key using SHA-256 (hex string output).
 * Uses the Web Crypto API available in both Node.js ≥ 18 and Edge runtime.
 */
export async function hashApiKey(rawKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(rawKey);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export type ValidateResult =
  | { valid: true; apiKeyId: string }
  | { valid: false; reason: "missing_api_key" | "invalid_api_key" };

/**
 * Validate an API key and update last_used_at if valid.
 * Returns the api_key_id on success, or an error reason on failure.
 */
export async function validateApiKey(rawKey: string): Promise<ValidateResult> {
  if (!rawKey || rawKey.trim() === "") {
    return { valid: false, reason: "missing_api_key" };
  }

  const keyHash = await hashApiKey(rawKey);

  const adminClient = createAdminClient();
  const now = new Date().toISOString();

  const { data, error } = await adminClient
    .from("api_keys")
    .select("id, active, revoked_at, expires_at")
    .eq("key_hash", keyHash)
    .single();

  if (error || !data) {
    return { valid: false, reason: "invalid_api_key" };
  }

  // Key must be active, not revoked, and not expired
  if (!data.active || data.revoked_at !== null) {
    return { valid: false, reason: "invalid_api_key" };
  }

  if (data.expires_at !== null && data.expires_at < now) {
    return { valid: false, reason: "invalid_api_key" };
  }

  // Update last_used_at (fire and forget — don't block the response)
  adminClient
    .from("api_keys")
    .update({ last_used_at: now })
    .eq("id", data.id)
    .then(() => {
      /* intentionally ignored */
    });

  return { valid: true, apiKeyId: data.id };
}
