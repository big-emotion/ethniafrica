import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/api/auth", () => ({
  hashApiKey: vi
    .fn()
    .mockResolvedValue(
      "pbkdf2v1:100000:AAAAAAAAAAAAAAAAAAAAAA==:deadbeef1234567890abcdef12345678deadbeef1234567890abcdef12345678"
    ),
  getKeyPrefix: vi.fn().mockReturnValue("pub_abcdef12345678"),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { GET } from "../route";

function makeRequest(headers: Record<string, string> = {}): NextRequest {
  return {
    headers: new Headers(headers),
  } as unknown as NextRequest;
}

describe("GET /api/v2/keys/issue", () => {
  const mockMaybySingle = vi.fn();
  const mockInsert = vi.fn();
  const mockFrom = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockMaybySingle.mockResolvedValue({ data: null, error: null });
    mockInsert.mockResolvedValue({ error: null });

    // Build a from() mock that handles both the IP-check (select chain) and insert
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                maybeSingle: mockMaybySingle,
              }),
            }),
          }),
        }),
      }),
      insert: mockInsert,
    });

    vi.mocked(createAdminClient).mockReturnValue({
      from: mockFrom,
    } as unknown as ReturnType<typeof createAdminClient>);
  });

  it("should return 201 with the raw key and tier on success (no IP header)", async () => {
    const response = await GET(makeRequest());
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.tier).toBe("public");
    expect(typeof json.key).toBe("string");
    expect(json.key.startsWith("pub_")).toBe(true);
    expect(json.note).toBeDefined();
  });

  it("should return 500 with failed_to_issue_key on DB insert error", async () => {
    mockInsert.mockResolvedValue({ error: { message: "DB error" } });

    const response = await GET(makeRequest());
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.error).toBe("failed_to_issue_key");
  });

  it("should insert with tier=public, active=true, name=public-key, key_prefix and key_hash", async () => {
    await GET(makeRequest());

    expect(mockFrom).toHaveBeenCalledWith("api_keys");
    const insertedRecord = mockInsert.mock.calls[0][0];
    expect(insertedRecord.tier).toBe("public");
    expect(insertedRecord.active).toBe(true);
    expect(insertedRecord.name).toBe("public-key");
    expect(insertedRecord.key_hash).toBeDefined();
    expect(insertedRecord.key_prefix).toBeDefined();
  });

  it("should capture and store IP from X-Forwarded-For header", async () => {
    await GET(makeRequest({ "X-Forwarded-For": "203.0.113.1, 10.0.0.1" }));

    const insertedRecord = mockInsert.mock.calls[0][0];
    expect(insertedRecord.ip_address).toBe("203.0.113.1");
  });

  it("should capture and store IP from X-Real-IP header when no X-Forwarded-For", async () => {
    await GET(makeRequest({ "X-Real-IP": "203.0.113.2" }));

    const insertedRecord = mockInsert.mock.calls[0][0];
    expect(insertedRecord.ip_address).toBe("203.0.113.2");
  });

  it("should store null ip_address when no IP headers are present", async () => {
    await GET(makeRequest());

    const insertedRecord = mockInsert.mock.calls[0][0];
    expect(insertedRecord.ip_address).toBeNull();
  });

  it("should return 409 when an active public key already exists for this IP", async () => {
    mockMaybySingle.mockResolvedValue({
      data: { id: "existing-key-id" },
      error: null,
    });

    const response = await GET(
      makeRequest({ "X-Forwarded-For": "203.0.113.1" })
    );
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json.error).toBe("key_already_issued");
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("should skip IP check and allow issuance when no IP headers are present", async () => {
    // No IP headers → IP check skipped → insert proceeds
    const response = await GET(makeRequest());
    expect(response.status).toBe(201);
    // maybySingle should not have been called (no IP to check)
    expect(mockMaybySingle).not.toHaveBeenCalled();
  });
});
