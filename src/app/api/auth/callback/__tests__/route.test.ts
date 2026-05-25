import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase/auth-server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

import { createServerSupabaseClient } from "@/lib/supabase/auth-server";
import { GET } from "../route";

function makeMockSupabase(
  exchangeResult: {
    error: null | { message: string };
    data: { user: object | null };
  },
  upsertError: null | { message: string } = null
) {
  const upsertFn = vi.fn().mockResolvedValue({ error: upsertError });
  const fromFn = vi.fn().mockReturnValue({
    upsert: upsertFn,
  });
  return {
    auth: {
      exchangeCodeForSession: vi.fn().mockResolvedValue(exchangeResult),
    },
    from: fromFn,
    _upsert: upsertFn,
  };
}

describe("GET /api/auth/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("upserts contributor_profiles with email prefix on magic-link exchange", async () => {
    const mockUser = {
      id: "user-uuid-1",
      email: "test@example.com",
      user_metadata: {},
      email_confirmed_at: "2026-01-01T00:00:00Z",
    };
    const mockSupabase = makeMockSupabase({
      error: null,
      data: { user: mockUser },
    });
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      mockSupabase as never
    );

    const url =
      "http://localhost/api/auth/callback?code=magic-code&redirect=/fr/compte/profil";
    const response = await GET(new NextRequest(url));

    expect(mockSupabase._upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "user-uuid-1",
        display_name: "test",
      }),
      expect.objectContaining({ onConflict: "id", ignoreDuplicates: true })
    );
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/fr/compte/profil");
  });

  it("upserts contributor_profiles with provider name on OAuth exchange", async () => {
    const mockUser = {
      id: "user-uuid-2",
      email: "oauth@example.com",
      user_metadata: { full_name: "Amina Diallo" },
      email_confirmed_at: "2026-01-01T00:00:00Z",
    };
    const mockSupabase = makeMockSupabase({
      error: null,
      data: { user: mockUser },
    });
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      mockSupabase as never
    );

    const url =
      "http://localhost/api/auth/callback?code=oauth-code&redirect=/fr/compte/profil";
    const response = await GET(new NextRequest(url));

    expect(mockSupabase._upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "user-uuid-2",
        display_name: "Amina Diallo",
      }),
      expect.objectContaining({ onConflict: "id", ignoreDuplicates: true })
    );
    expect(response.status).toBe(307);
  });

  it("redirects to error URL when code exchange fails", async () => {
    const mockSupabase = makeMockSupabase({
      error: { message: "Invalid code" },
      data: { user: null },
    });
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      mockSupabase as never
    );

    const url = "http://localhost/api/auth/callback?code=bad-code";
    const response = await GET(new NextRequest(url));

    expect(mockSupabase._upsert).not.toHaveBeenCalled();
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("error");
  });
});
