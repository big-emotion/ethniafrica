import { describe, it, expect, vi, beforeEach } from "vitest";
import { hashApiKey, validateApiKey } from "@/lib/api/auth";

// Mock the admin client
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

import { createAdminClient } from "@/lib/supabase/admin";

describe("hashApiKey", () => {
  it("should return a hex string of length 64 (SHA-256)", async () => {
    const hash = await hashApiKey("test-key-123");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("should return the same hash for the same input", async () => {
    const hash1 = await hashApiKey("my-secret-key");
    const hash2 = await hashApiKey("my-secret-key");
    expect(hash1).toBe(hash2);
  });

  it("should return different hashes for different inputs", async () => {
    const hash1 = await hashApiKey("key-a");
    const hash2 = await hashApiKey("key-b");
    expect(hash1).not.toBe(hash2);
  });
});

describe("validateApiKey", () => {
  const mockFrom = vi.fn();
  const mockAdminClient = { from: mockFrom };

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

  it("should return invalid_api_key when key not found in DB", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi
            .fn()
            .mockResolvedValue({
              data: null,
              error: { message: "No rows found" },
            }),
        }),
      }),
    });

    const result = await validateApiKey("unknown-key");
    expect(result).toEqual({ valid: false, reason: "invalid_api_key" });
  });

  it("should return invalid_api_key for inactive key", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: "uuid-1",
              active: false,
              revoked_at: null,
              expires_at: null,
            },
            error: null,
          }),
        }),
      }),
    });

    const result = await validateApiKey("inactive-key");
    expect(result).toEqual({ valid: false, reason: "invalid_api_key" });
  });

  it("should return invalid_api_key for revoked key", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: "uuid-2",
              active: true,
              revoked_at: "2024-01-01T00:00:00Z",
              expires_at: null,
            },
            error: null,
          }),
        }),
      }),
    });

    const result = await validateApiKey("revoked-key");
    expect(result).toEqual({ valid: false, reason: "invalid_api_key" });
  });

  it("should return invalid_api_key for expired key", async () => {
    const pastDate = new Date(Date.now() - 1000 * 60 * 60).toISOString(); // 1 hour ago
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: "uuid-3",
              active: true,
              revoked_at: null,
              expires_at: pastDate,
            },
            error: null,
          }),
        }),
      }),
    });

    const result = await validateApiKey("expired-key");
    expect(result).toEqual({ valid: false, reason: "invalid_api_key" });
  });

  it("should return valid with apiKeyId for a valid key", async () => {
    const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
    const updateEqMock = vi.fn().mockResolvedValue({ error: null });
    const updateMock = vi.fn().mockReturnValue({ eq: updateEqMock });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "uuid-valid",
                  active: true,
                  revoked_at: null,
                  expires_at: futureDate,
                },
                error: null,
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

  it("should return valid with null expires_at (never expires)", async () => {
    const updateEqMock = vi.fn().mockResolvedValue({ error: null });
    const updateMock = vi.fn().mockReturnValue({ eq: updateEqMock });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "uuid-valid-2",
                  active: true,
                  revoked_at: null,
                  expires_at: null,
                },
                error: null,
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
