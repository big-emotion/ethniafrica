import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase/auth-server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi
            .fn()
            .mockResolvedValue({ data: { id: "contrib-1" }, error: null }),
        })),
      })),
    })),
  })),
}));

vi.mock("@/lib/validations/contribution", () => ({
  contributionSchema: {
    safeParse: vi.fn(() => ({
      success: true,
      data: {
        type: "update_people",
        proposed_payload: { name: "test" },
        contributor_email: "test@example.com",
        contributor_name: "Test",
        notes: "",
      },
    })),
  },
}));

vi.mock("@/lib/api/cors", () => ({
  jsonWithCors: vi.fn((data, init) => new Response(JSON.stringify(data), init)),
  corsOptionsResponse: vi.fn(() => new Response(null, { status: 204 })),
}));

vi.mock("@/lib/api/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { createServerSupabaseClient } from "@/lib/supabase/auth-server";
import { POST } from "../route";

function makeRequest() {
  return new NextRequest("http://localhost/api/contributions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "update_people", proposed_payload: {} }),
  });
}

describe("POST /api/contributions — email verification gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when authenticated user has unverified email", async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: "u1",
              email: "u@example.com",
              email_confirmed_at: null,
            },
          },
          error: null,
        }),
      },
    } as never);

    const response = await POST(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("UNAUTHORIZED");
    expect(body.message).toMatch(/non vérifié/i);
  });

  it("allows anonymous requests (no session) to proceed", async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    } as never);

    const response = await POST(makeRequest());

    expect(response.status).toBe(201);
  });

  it("allows requests from users with verified email", async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: "u2",
              email: "verified@example.com",
              email_confirmed_at: "2026-01-01T00:00:00Z",
            },
          },
          error: null,
        }),
      },
    } as never);

    const response = await POST(makeRequest());

    expect(response.status).toBe(201);
  });
});
