import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/api/auth", () => ({
  hashApiKey: vi
    .fn()
    .mockResolvedValue(
      "deadbeef1234567890abcdef12345678deadbeef1234567890abcdef12345678"
    ),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

import { createAdminClient } from "@/lib/supabase/admin";
import { GET } from "../route";

describe("GET /api/v2/keys/issue", () => {
  const mockInsert = vi.fn();
  const mockFrom = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({ insert: mockInsert });
    vi.mocked(createAdminClient).mockReturnValue({
      from: mockFrom,
    } as unknown as ReturnType<typeof createAdminClient>);
  });

  it("should return 201 with the raw key and tier on success", async () => {
    mockInsert.mockResolvedValue({ error: null });

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.tier).toBe("public");
    expect(json.key).toBeDefined();
    expect(typeof json.key).toBe("string");
    expect(json.key.startsWith("pub_")).toBe(true);
    expect(json.note).toBeDefined();
  });

  it("should return 500 with failed_to_issue_key on DB error", async () => {
    mockInsert.mockResolvedValue({ error: { message: "DB error" } });

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.error).toBe("failed_to_issue_key");
  });

  it("should insert with tier=public, active=true, name=public-key", async () => {
    mockInsert.mockResolvedValue({ error: null });

    await GET();

    expect(mockFrom).toHaveBeenCalledWith("api_keys");
    const insertedRecord = mockInsert.mock.calls[0][0];
    expect(insertedRecord.tier).toBe("public");
    expect(insertedRecord.active).toBe(true);
    expect(insertedRecord.name).toBe("public-key");
    expect(insertedRecord.key_hash).toBeDefined();
  });
});
