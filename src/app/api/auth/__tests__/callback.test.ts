import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../callback/route";

// Mock the createServerSupabaseClient
const mockExchangeCodeForSession = vi.fn();

vi.mock("@/lib/supabase/auth-server", () => ({
  createServerSupabaseClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        exchangeCodeForSession: mockExchangeCodeForSession,
      },
    })
  ),
}));

describe("API - Auth Callback Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/auth/callback", () => {
    it("should redirect to specified redirect URL after successful code exchange", async () => {
      mockExchangeCodeForSession.mockResolvedValue({
        data: { session: { user: { id: "123" } } },
        error: null,
      });

      const request = new NextRequest(
        "http://localhost/api/auth/callback?code=test-code&redirect=/admin/dashboard"
      );
      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("Location")).toBe(
        "http://localhost/admin/dashboard"
      );
      expect(mockExchangeCodeForSession).toHaveBeenCalledWith("test-code");
    });

    it("should redirect to /admin/contributions when no redirect specified", async () => {
      mockExchangeCodeForSession.mockResolvedValue({
        data: { session: { user: { id: "123" } } },
        error: null,
      });

      const request = new NextRequest(
        "http://localhost/api/auth/callback?code=test-code"
      );
      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("Location")).toBe(
        "http://localhost/admin/contributions"
      );
    });

    it("should redirect to /admin/login with error when code exchange fails", async () => {
      mockExchangeCodeForSession.mockResolvedValue({
        data: { session: null },
        error: { message: "Invalid code" },
      });

      const request = new NextRequest(
        "http://localhost/api/auth/callback?code=invalid-code"
      );
      const response = await GET(request);

      expect(response.status).toBe(307);
      const location = response.headers.get("Location");
      expect(location).toContain("/admin/login");
      expect(location).toContain("error=");
    });

    it("should redirect to /admin/login when no code provided", async () => {
      const request = new NextRequest("http://localhost/api/auth/callback");
      const response = await GET(request);

      expect(response.status).toBe(307);
      const location = response.headers.get("Location");
      expect(location).toContain("/admin/login");
      expect(location).toContain("error=");
      expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
    });
  });
});
