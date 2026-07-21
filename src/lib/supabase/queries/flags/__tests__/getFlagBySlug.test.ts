import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: vi.fn(),
}));

import { getFlagBySlug } from "../getFlagBySlug";
import { createServerClient } from "@/lib/supabase/server";

describe("getFlagBySlug", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockSupabase: any;

  const baseFlag = {
    id: "uuid-flag-1",
    public_slug: "ABC123DEFG",
    flag_kind: "inaccurate" as const,
    status: "open" as const,
    entity_type: "people",
    entity_id: "PPL_YORUBA",
    reason_text: "The population figure is incorrect.",
    contributor_id: "uuid-user-1",
    assertion_id: null,
    assertion_field_path: null,
    counter_source_url: null,
    counter_source_citation: null,
    proposed_rewrite: null,
    moderator_id: null,
    moderator_notes: null,
    resolved_at: null,
    created_at: "2025-01-15T10:00:00Z",
    updated_at: "2025-01-15T10:00:00Z",
    severity: null,
    auto_generated: false,
    turnstile_token_verified: true,
  };

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn(() => mockSupabase),
      select: vi.fn(() => mockSupabase),
      eq: vi.fn(() => mockSupabase),
      maybeSingle: vi.fn(),
    };
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (createServerClient as any).mockReturnValue(mockSupabase);
  });

  it("returns null when the flag is not found", async () => {
    mockSupabase.maybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await getFlagBySlug("NOTEXIST01");

    expect(result).toBeNull();
  });

  it("returns null on database error", async () => {
    mockSupabase.maybeSingle.mockResolvedValue({
      data: null,
      error: { message: "connection failure" },
    });

    const result = await getFlagBySlug("ABC123DEFG");

    expect(result).toBeNull();
  });

  it("returns the flag with null contributor when contributor_id is null", async () => {
    const flagNoContributor = { ...baseFlag, contributor_id: null };
    mockSupabase.maybeSingle.mockResolvedValueOnce({
      data: flagNoContributor,
      error: null,
    });

    const result = await getFlagBySlug("ABC123DEFG");

    expect(result).not.toBeNull();
    expect(result?.flag.public_slug).toBe("ABC123DEFG");
    expect(result?.contributor).toBeNull();
    expect(result?.assertion).toBeNull();
  });

  it("returns contributor profile when public = true", async () => {
    mockSupabase.maybeSingle
      .mockResolvedValueOnce({ data: baseFlag, error: null }) // flag fetch
      .mockResolvedValueOnce({
        data: { display_name: "Alice", public: true },
        error: null,
      }); // contributor fetch

    const result = await getFlagBySlug("ABC123DEFG");

    expect(result?.contributor?.display_name).toBe("Alice");
    expect(result?.contributor?.public).toBe(true);
  });

  it("returns contributor with public = false (privacy guard expects caller to handle)", async () => {
    mockSupabase.maybeSingle
      .mockResolvedValueOnce({ data: baseFlag, error: null })
      .mockResolvedValueOnce({
        data: { display_name: "Bob", public: false },
        error: null,
      });

    const result = await getFlagBySlug("ABC123DEFG");

    expect(result?.contributor?.public).toBe(false);
  });

  it("returns null contributor when profile query returns no row", async () => {
    mockSupabase.maybeSingle
      .mockResolvedValueOnce({ data: baseFlag, error: null })
      .mockResolvedValueOnce({ data: null, error: null });

    const result = await getFlagBySlug("ABC123DEFG");

    expect(result?.contributor).toBeNull();
  });

  it("returns assertion context when assertion_id is set", async () => {
    const flagWithAssertion = {
      ...baseFlag,
      assertion_id: "uuid-assertion-1",
      assertion_field_path: "demographics.population",
    };
    mockSupabase.maybeSingle
      .mockResolvedValueOnce({ data: flagWithAssertion, error: null })
      .mockResolvedValueOnce({
        data: { display_name: "Alice", public: true },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          field_path: "demographics.population",
          statement: "15 millions d'habitants",
        },
        error: null,
      });

    const result = await getFlagBySlug("ABC123DEFG");

    expect(result?.assertion?.field_path).toBe("demographics.population");
    expect(result?.assertion?.statement).toBe("15 millions d'habitants");
  });

  it("returns null assertion when assertion fetch fails", async () => {
    const flagWithAssertion = { ...baseFlag, assertion_id: "uuid-assertion-1" };
    mockSupabase.maybeSingle
      .mockResolvedValueOnce({ data: flagWithAssertion, error: null })
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: "not found" } });

    const result = await getFlagBySlug("ABC123DEFG");

    expect(result?.assertion).toBeNull();
  });
});
