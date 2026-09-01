/**
 * Self-service API key management (ETNI-81).
 *
 * Baseline from ETNI-173/174: the `api_keys` table, PBKDF2 hashing
 * (`@/lib/api/auth`) and the anonymous `/api/v2/keys/issue` public-tier
 * issuance endpoint. This module adds the session-authenticated operations a
 * signed-in developer needs to manage their own keys — list, create, revoke —
 * scoped to `user_id` and always at `tier: "public"`; `partner`/`admin` tiers
 * stay admin-issued.
 */
import { getKeyPrefix, hashApiKey, type ApiKeyTier } from "@/lib/api/auth";
import { logger } from "@/lib/api/logger";
import { createAdminClient } from "@/lib/supabase/admin";

export interface ApiKeySummary {
  id: string;
  label: string | null;
  tier: ApiKeyTier;
  active: boolean;
  key_prefix: string | null;
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
}

export interface CreatedApiKey extends ApiKeySummary {
  /** Raw key — the only time it is ever readable. Never persisted or logged. */
  key: string;
}

const SELF_SERVICE_COLUMNS =
  "id, label, tier, active, key_prefix, created_at, last_used_at, expires_at, revoked_at";

/**
 * Resolves the Supabase session bearer token carried in the request's
 * Authorization header. Mirrors `getAuthenticatedContributor` in
 * `@/api/v2/services/flags` — duplicated rather than shared, matching that
 * file's own precedent alongside `reference-library.ts`.
 */
// @req REQ-056
export async function getAuthenticatedUser(
  accessToken: string
): Promise<{ id: string } | null> {
  const supabase = createAdminClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(accessToken);

  if (error || !user) {
    if (error) logger.error("Failed to authenticate API key request", error);
    return null;
  }

  return { id: user.id };
}

// @req REQ-056
export async function listUserApiKeys(
  userId: string
): Promise<ApiKeySummary[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("api_keys")
    .select(SELF_SERVICE_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    logger.error("Failed to list user API keys", error);
    throw new Error(`Failed to list user API keys: ${error.message}`);
  }

  return data ?? [];
}

// @req REQ-056
export async function createUserApiKey(
  userId: string,
  label: string
): Promise<CreatedApiKey> {
  const rawKey = `usr_${crypto.randomUUID().replace(/-/g, "")}_${crypto.randomUUID().replace(/-/g, "")}`;
  const keyHash = await hashApiKey(rawKey);
  const keyPrefix = getKeyPrefix(rawKey);
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("api_keys")
    .insert({
      key_hash: keyHash,
      key_prefix: keyPrefix,
      name: label,
      label,
      tier: "public",
      active: true,
      user_id: userId,
      created_by: userId,
    })
    .select(SELF_SERVICE_COLUMNS)
    .single();

  if (error) {
    logger.error("Failed to create user API key", error);
    throw new Error(`Failed to create user API key: ${error.message}`);
  }

  return { ...data, key: rawKey };
}

export type RevokeApiKeyResult = "revoked" | "not_found";

/**
 * `not_found` also covers "belongs to another user" and "already revoked" —
 * collapsed on purpose so a probe against someone else's key id learns
 * nothing it couldn't already infer.
 */
// @req REQ-056
export async function revokeUserApiKey(
  userId: string,
  keyId: string
): Promise<RevokeApiKeyResult> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("api_keys")
    .update({ active: false, revoked_at: new Date().toISOString() })
    .eq("id", keyId)
    .eq("user_id", userId)
    .is("revoked_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    logger.error("Failed to revoke user API key", error, { keyId });
    throw new Error(`Failed to revoke user API key: ${error.message}`);
  }

  return data ? "revoked" : "not_found";
}
