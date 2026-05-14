import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { hashApiKey, getKeyPrefix, validateApiKey } from "@/lib/api/auth";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

import { createAdminClient } from "@/lib/supabase/admin";

describe("hashApiKey", () => {
  it("should return a pbkdf2v1 formatted hash string", async () => {
    const hash = await hashApiKey("test-key-123");
    expect(hash).toMatch(/^pbkdf2v1:\d+:[A-Za-z0-9+/=]+:[0-9a-f]{64}$/);
  });

  it("should embed the PBKDF2 iteration count in the hash string", async () => {
    const hash = await hashApiKey("my-secret-key");
    const parts = hash.split(":");
    expect(parseInt(parts[1])).toBeGreaterThan(0);
  });

  it("should hash new keys at OWASP-recommended 600,000 iterations", async () => {
    const hash = await hashApiKey("rotation-key");
    const parts = hash.split(":");
    expect(parseInt(parts[1], 10)).toBe(600_000);
  });

  it("should round-trip a key hashed with the current iteration count", async () => {
    const hash = await hashApiKey("rt-key");
    const updateEqMock = vi.fn().mockResolvedValue({ error: null });
    const updateMock = vi.fn().mockReturnValue({ eq: updateEqMock });
    const fromMock = vi.fn();
    let n = 0;
    fromMock.mockImplementation(() => {
      n++;
      if (n === 1) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: "uuid-rt",
                      key_hash: hash,
                      revoked_at: null,
                      expires_at: null,
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return { update: updateMock };
    });
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: fromMock,
    });
    const result = await validateApiKey("rt-key");
    expect(result).toEqual({ valid: true, apiKeyId: "uuid-rt" });
  });

  it("should still validate a key hashed with the legacy 100,000 iterations", async () => {
    // Hash format: "pbkdf2v1:{iterations}:{base64_salt}:{hex_hash}"
    // Build a legacy hash manually using a fixed salt and 100k iterations.
    const enc = new TextEncoder();
    const salt = new Uint8Array(16);
    crypto.getRandomValues(salt);
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      enc.encode("legacy-key"),
      { name: "PBKDF2" },
      false,
      ["deriveBits"]
    );
    const derivedBits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt, iterations: 100_000, hash: "SHA-256" },
      keyMaterial,
      256
    );
    const hex = Array.from(new Uint8Array(derivedBits))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const saltB64 = btoa(String.fromCharCode(...Array.from(salt)));
    const legacyHash = `pbkdf2v1:100000:${saltB64}:${hex}`;

    const updateEqMock = vi.fn().mockResolvedValue({ error: null });
    const updateMock = vi.fn().mockReturnValue({ eq: updateEqMock });
    const fromMock = vi.fn();
    let n = 0;
    fromMock.mockImplementation(() => {
      n++;
      if (n === 1) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: "uuid-legacy",
                      key_hash: legacyHash,
                      revoked_at: null,
                      expires_at: null,
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return { update: updateMock };
    });
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: fromMock,
    });
    const result = await validateApiKey("legacy-key");
    expect(result).toEqual({ valid: true, apiKeyId: "uuid-legacy" });
  });

  it("should produce different hashes for the same input (random salt)", async () => {
    const hash1 = await hashApiKey("same-key");
    const hash2 = await hashApiKey("same-key");
    expect(hash1).not.toBe(hash2);
  });

  it("should produce different hashes for different inputs", async () => {
    const hash1 = await hashApiKey("key-a");
    const hash2 = await hashApiKey("key-b");
    expect(hash1).not.toBe(hash2);
  });
});

describe("getKeyPrefix", () => {
  it("should return first 20 characters of the key", () => {
    expect(getKeyPrefix("pub_abcdef1234567890abcdef1234567890")).toBe(
      "pub_abcdef1234567890"
    );
  });

  it("should return the full key if shorter than 20 chars", () => {
    expect(getKeyPrefix("short")).toBe("short");
  });
});

describe("validateApiKey", () => {
  const mockFrom = vi.fn();
  const mockAdminClient = { from: mockFrom };

  // Pre-compute a valid PBKDF2 hash for "valid-key" once (reused across tests)
  let validKeyHash: string;

  beforeAll(async () => {
    validKeyHash = await hashApiKey("valid-key");
  });

  beforeEach(() => {
    vi.clearAllMocks();
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      mockAdminClient
    );
  });

  it("should return missing_api_key for empty string", async () => {
    const result = await validateApiKey("");
    expect(result).toEqual({ valid: false, reason: "missing_api_key" });
  });

  it("should return missing_api_key for whitespace-only string", async () => {
    const result = await validateApiKey("   ");
    expect(result).toEqual({ valid: false, reason: "missing_api_key" });
  });

  it("should return invalid_api_key when no active key found for prefix", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }),
    });

    const result = await validateApiKey("unknown-key");
    expect(result).toEqual({ valid: false, reason: "invalid_api_key" });
  });

  it("should return invalid_api_key when DB query errors", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "Connection error" },
            }),
          }),
        }),
      }),
    });

    const result = await validateApiKey("some-key");
    expect(result).toEqual({ valid: false, reason: "invalid_api_key" });
  });

  it("should return invalid_api_key for revoked key", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: [
                {
                  id: "uuid-2",
                  key_hash: validKeyHash,
                  revoked_at: "2024-01-01T00:00:00Z",
                  expires_at: null,
                },
              ],
              error: null,
            }),
          }),
        }),
      }),
    });

    const result = await validateApiKey("valid-key");
    expect(result).toEqual({ valid: false, reason: "invalid_api_key" });
  });

  it("should return invalid_api_key for expired key", async () => {
    const pastDate = new Date(Date.now() - 1000 * 60 * 60).toISOString();
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: [
                {
                  id: "uuid-3",
                  key_hash: validKeyHash,
                  revoked_at: null,
                  expires_at: pastDate,
                },
              ],
              error: null,
            }),
          }),
        }),
      }),
    });

    const result = await validateApiKey("valid-key");
    expect(result).toEqual({ valid: false, reason: "invalid_api_key" });
  });

  it("should return invalid_api_key when hash does not match key", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: [
                {
                  id: "uuid-mismatch",
                  key_hash: validKeyHash,
                  revoked_at: null,
                  expires_at: null,
                },
              ],
              error: null,
            }),
          }),
        }),
      }),
    });

    // "wrong-key" won't match validKeyHash (which was hashed from "valid-key")
    const result = await validateApiKey("wrong-key");
    expect(result).toEqual({ valid: false, reason: "invalid_api_key" });
  });

  it("should return valid with apiKeyId for a matching key", async () => {
    const updateEqMock = vi.fn().mockResolvedValue({ error: null });
    const updateMock = vi.fn().mockReturnValue({ eq: updateEqMock });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: "uuid-valid",
                      key_hash: validKeyHash,
                      revoked_at: null,
                      expires_at: null,
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return { update: updateMock };
    });

    const result = await validateApiKey("valid-key");
    expect(result).toEqual({ valid: true, apiKeyId: "uuid-valid" });
  });

  it("should return valid for a key with null expires_at (never expires)", async () => {
    const neverExpiresHash = await hashApiKey("non-expiring-key");
    const updateEqMock = vi.fn().mockResolvedValue({ error: null });
    const updateMock = vi.fn().mockReturnValue({ eq: updateEqMock });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: "uuid-valid-2",
                      key_hash: neverExpiresHash,
                      revoked_at: null,
                      expires_at: null,
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return { update: updateMock };
    });

    const result = await validateApiKey("non-expiring-key");
    expect(result).toEqual({ valid: true, apiKeyId: "uuid-valid-2" });
  });
});
