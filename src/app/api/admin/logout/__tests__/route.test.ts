import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Supabase client before importing the route
const mockSignOut = vi.fn();
vi.mock("@/lib/supabase/auth-server", () => ({
  createServerSupabaseClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        signOut: mockSignOut,
      },
    })
  ),
}));

// Mock CORS utilities
vi.mock("@/lib/api/cors", () => ({
  jsonWithCors: vi.fn((data: unknown, init?: ResponseInit) => {
    return new Response(JSON.stringify(data), {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }),
  corsOptionsResponse: vi.fn(
    () =>
      new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type,Authorization",
        },
      })
  ),
}));

import { POST, OPTIONS } from "../route";

describe("Admin Logout Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignOut.mockResolvedValue({ error: null });
  });

  describe("POST", () => {
    it("should call supabase.auth.signOut()", async () => {
      await POST();

      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });

    it("should return success response", async () => {
      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        message: "Logout successful",
      });
    });

    it("should return error response when signOut fails", async () => {
      mockSignOut.mockRejectedValue(new Error("Sign out failed"));

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Internal server error" });
    });
  });

  describe("OPTIONS", () => {
    it("should return CORS headers", () => {
      const response = OPTIONS();

      expect(response.status).toBe(204);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
      expect(response.headers.get("Access-Control-Allow-Methods")).toBe(
        "GET,OPTIONS"
      );
      expect(response.headers.get("Access-Control-Allow-Headers")).toBe(
        "Content-Type,Authorization"
      );
    });
  });
});
