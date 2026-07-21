import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getUserRoles,
  hasRole,
  isAdmin,
  type UserRole,
} from "../supabase-auth";

// Mock the auth-server module
vi.mock("../../supabase/auth-server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

import { createServerSupabaseClient } from "../../supabase/auth-server";

const mockCreateServerSupabaseClient = vi.mocked(createServerSupabaseClient);

describe("supabase-auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getUserRoles", () => {
    it("should return correct roles for a user", async () => {
      const mockRoles = [{ role: "admin" }, { role: "moderator" }];

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: mockRoles,
              error: null,
            }),
          }),
        }),
      };

      mockCreateServerSupabaseClient.mockResolvedValue(mockSupabase as never);

      const result = await getUserRoles("user-123");

      expect(result).toEqual(["admin", "moderator"]);
      expect(mockSupabase.from).toHaveBeenCalledWith("user_roles");
    });

    it("should return empty array when user has no roles", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      };

      mockCreateServerSupabaseClient.mockResolvedValue(mockSupabase as never);

      const result = await getUserRoles("user-no-roles");

      expect(result).toEqual([]);
    });

    it("should return empty array on error", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "Database error" },
            }),
          }),
        }),
      };

      mockCreateServerSupabaseClient.mockResolvedValue(mockSupabase as never);

      const result = await getUserRoles("user-123");

      expect(result).toEqual([]);
    });
  });

  describe("hasRole", () => {
    it("should return true when user has the specified role", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [{ role: "admin" }, { role: "contributor" }],
              error: null,
            }),
          }),
        }),
      };

      mockCreateServerSupabaseClient.mockResolvedValue(mockSupabase as never);

      const result = await hasRole("user-123", "admin");

      expect(result).toBe(true);
    });

    it("should return false when user does not have the specified role", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [{ role: "reader" }],
              error: null,
            }),
          }),
        }),
      };

      mockCreateServerSupabaseClient.mockResolvedValue(mockSupabase as never);

      const result = await hasRole("user-123", "admin");

      expect(result).toBe(false);
    });

    it("should return false when user has no roles", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      };

      mockCreateServerSupabaseClient.mockResolvedValue(mockSupabase as never);

      const result = await hasRole("user-123", "moderator");

      expect(result).toBe(false);
    });

    it("should work with all valid role types", async () => {
      const allRoles: UserRole[] = [
        "reader",
        "contributor",
        "moderator",
        "admin",
        "advisor",
      ];

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: allRoles.map((role) => ({ role })),
              error: null,
            }),
          }),
        }),
      };

      mockCreateServerSupabaseClient.mockResolvedValue(mockSupabase as never);

      for (const role of allRoles) {
        const result = await hasRole("user-all-roles", role);
        expect(result).toBe(true);
      }
    });
  });

  describe("isAdmin", () => {
    it("should return true when user has admin role", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [{ role: "admin" }],
              error: null,
            }),
          }),
        }),
      };

      mockCreateServerSupabaseClient.mockResolvedValue(mockSupabase as never);

      const result = await isAdmin("admin-user");

      expect(result).toBe(true);
    });

    it("should return true when user has admin role among others", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [
                { role: "moderator" },
                { role: "admin" },
                { role: "contributor" },
              ],
              error: null,
            }),
          }),
        }),
      };

      mockCreateServerSupabaseClient.mockResolvedValue(mockSupabase as never);

      const result = await isAdmin("multi-role-admin");

      expect(result).toBe(true);
    });

    it("should return false when user does not have admin role", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [{ role: "reader" }, { role: "contributor" }],
              error: null,
            }),
          }),
        }),
      };

      mockCreateServerSupabaseClient.mockResolvedValue(mockSupabase as never);

      const result = await isAdmin("non-admin-user");

      expect(result).toBe(false);
    });

    it("should return false when user has no roles", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      };

      mockCreateServerSupabaseClient.mockResolvedValue(mockSupabase as never);

      const result = await isAdmin("no-role-user");

      expect(result).toBe(false);
    });

    it("should return false on database error", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "Connection failed" },
            }),
          }),
        }),
      };

      mockCreateServerSupabaseClient.mockResolvedValue(mockSupabase as never);

      const result = await isAdmin("user-with-error");

      expect(result).toBe(false);
    });
  });
});
