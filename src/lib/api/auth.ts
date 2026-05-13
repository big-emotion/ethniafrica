/**
 * API Key Authentication
 * Validates API keys against the api_keys table (migration 011/012)
 *
 * Keys are hashed with PBKDF2-SHA256 (NIST SP 800-132, OWASP recommended):
 * salted, slow, no rainbow tables. Raw keys are never stored.
 * key_prefix (first 20 chars) is stored in plaintext for fast DB lookup.
 * Hash format: "pbkdf2v1:{iterations}:{base64_salt}:{hex_hash}"
 */
import { createAdminClient } from "@/lib/supabase/admin";

// OWASP 2023 recommendation for PBKDF2-SHA256.
// Legacy hashes encoded with lower iteration counts still validate because
// the stored format embeds the per-key iteration count.
const PBKDF2_ITERATIONS = 600_000;
const SALT_BYTES = 16;
const KEY_PREFIX_LENGTH = 20;

export function getKeyPrefix(rawKey: string): string {
  return rawKey.substring(0, KEY_PREFIX_LENGTH);
}

async function pbkdf2Derive(
  rawKey: string,
  salt: Uint8Array,
  iterations: number
): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(rawKey),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const derivedBits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return Array.from(new Uint8Array(derivedBits))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Hash a raw API key with PBKDF2-SHA256 + random salt.
 * Returns a self-describing string: "pbkdf2v1:{iterations}:{base64_salt}:{hex_hash}".
 */
export async function hashApiKey(rawKey: string): Promise<string> {
  const salt = new Uint8Array(SALT_BYTES);
  crypto.getRandomValues(salt);
  const saltB64 = btoa(String.fromCharCode(...Array.from(salt)));
  const hash = await pbkdf2Derive(rawKey, salt, PBKDF2_ITERATIONS);
  return `pbkdf2v1:${PBKDF2_ITERATIONS}:${saltB64}:${hash}`;
}

async function verifyHashedKey(
  rawKey: string,
  storedHash: string
): Promise<boolean> {
  const parts = storedHash.split(":");
  if (parts.length !== 4 || parts[0] !== "pbkdf2v1") return false;
  const iterations = parseInt(parts[1], 10);
  const saltB64 = parts[2];
  const expectedHex = parts[3];
  if (!iterations || !saltB64 || !expectedHex) return false;
  const salt = Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0));
  const computed = await pbkdf2Derive(rawKey, salt, iterations);
  return computed === expectedHex;
}

export type ValidateResult =
  | { valid: true; apiKeyId: string }
  | { valid: false; reason: "missing_api_key" | "invalid_api_key" };

/**
 * Validate an API key and update last_used_at if valid.
 * Looks up by key_prefix, then verifies with PBKDF2.
 */
export async function validateApiKey(rawKey: string): Promise<ValidateResult> {
  if (!rawKey || rawKey.trim() === "") {
    return { valid: false, reason: "missing_api_key" };
  }

  const prefix = getKeyPrefix(rawKey);
  const adminClient = createAdminClient();
  const now = new Date().toISOString();

  const { data: rows, error } = await adminClient
    .from("api_keys")
    .select("id, key_hash, revoked_at, expires_at")
    .eq("key_prefix", prefix)
    .eq("active", true)
    .limit(1);

  if (error || !rows || rows.length === 0) {
    return { valid: false, reason: "invalid_api_key" };
  }

  const row = rows[0];

  if (row.revoked_at !== null) {
    return { valid: false, reason: "invalid_api_key" };
  }

  if (row.expires_at !== null && row.expires_at < now) {
    return { valid: false, reason: "invalid_api_key" };
  }

  const isValid = await verifyHashedKey(rawKey, row.key_hash);
  if (!isValid) {
    return { valid: false, reason: "invalid_api_key" };
  }

  // Update last_used_at (fire and forget — don't block the response)
  adminClient
    .from("api_keys")
    .update({ last_used_at: now })
    .eq("id", row.id)
    .then(() => {
      /* intentionally ignored */
    });

  return { valid: true, apiKeyId: row.id };
}
