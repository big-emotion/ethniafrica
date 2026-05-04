import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "../middleware";
import { createServerClient } from "@supabase/ssr";

// Mock @supabase/ssr
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(),
}));

describe("middleware", () => {
  const mockGetUser = vi.fn();
  const mockFrom = vi.fn();
  const mockSelect = vi.fn();
  const mockEq = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup chain: from().select().eq()
    mockEq.mockResolvedValue({ data: [], error: null });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });

    (createServerClient as Mock).mockReturnValue({
      auth: {
        getUser: mockGetUser,
      },
      from: mockFrom,
    });
  });

  it("redirects unauthenticated user to login with redirect param", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const request = new NextRequest("http://localhost:3000/admin/dashboard");
    const response = await middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/admin/login?redirect=%2Fadmin%2Fdashboard"
    );
  });

  it("redirects authenticated non-admin user to /forbidden", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
    mockEq.mockResolvedValue({ data: [{ role: "reader" }], error: null });

    const request = new NextRequest("http://localhost:3000/admin/dashboard");
    const response = await middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/forbidden"
    );
    expect(mockFrom).toHaveBeenCalledWith("user_roles");
    expect(mockSelect).toHaveBeenCalledWith("role");
    expect(mockEq).toHaveBeenCalledWith("user_id", "user-123");
  });

  it("allows authenticated admin user to pass through", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "admin-123" } },
      error: null,
    });
    mockEq.mockResolvedValue({ data: [{ role: "admin" }], error: null });

    const request = new NextRequest("http://localhost:3000/admin/dashboard");
    const response = await middleware(request);

    // Should be a NextResponse.next() response, not a redirect
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("allows access to /admin/login without authentication", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const request = new NextRequest("http://localhost:3000/admin/login");
    const response = await middleware(request);

    // Should pass through without redirect
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("handles user with multiple roles including admin", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "multi-role-user" } },
      error: null,
    });
    mockEq.mockResolvedValue({
      data: [{ role: "reader" }, { role: "admin" }],
      error: null,
    });

    const request = new NextRequest("http://localhost:3000/admin/settings");
    const response = await middleware(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("handles database error when fetching roles", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
    mockEq.mockResolvedValue({ data: null, error: new Error("DB error") });

    const request = new NextRequest("http://localhost:3000/admin/dashboard");
    const response = await middleware(request);

    // Should redirect to forbidden when roles can't be fetched
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/forbidden"
    );
  });

  it("refreshes session on non-admin routes", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const request = new NextRequest("http://localhost:3000/some-page");
    const response = await middleware(request);

    // Should call getUser to refresh session
    expect(mockGetUser).toHaveBeenCalled();
    // Should pass through (not redirect)
    expect(response.status).toBe(200);
  });
});
