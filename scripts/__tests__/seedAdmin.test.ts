import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import {
  isValidEmail,
  findUserByEmail,
  assignAdminRole,
} from "../seedAdmin";
import { createAdminClient } from "@/lib/supabase/admin";

// Mock the admin client
vi.mock("@/lib/supabase/admin");

describe("seedAdmin", () => {
  describe("isValidEmail", () => {
    it("should return true for valid email formats", () => {
      expect(isValidEmail("admin@example.com")).toBe(true);
      expect(isValidEmail("user.name@domain.org")).toBe(true);
      expect(isValidEmail("test+tag@subdomain.example.co.uk")).toBe(true);
    });

    it("should return false for invalid email formats", () => {
      expect(isValidEmail("")).toBe(false);
      expect(isValidEmail("notanemail")).toBe(false);
      expect(isValidEmail("missing@domain")).toBe(false);
      expect(isValidEmail("@nodomain.com")).toBe(false);
      expect(isValidEmail("spaces in@email.com")).toBe(false);
      expect(isValidEmail("no@dots")).toBe(false);
    });
  });

  describe("findUserByEmail", () => {
    const mockUsers = [
      { id: "user-1", email: "admin@example.com" },
      { id: "user-2", email: "other@example.com" },
    ];

    let mockListUsers: Mock;
    let mockSupabase: ReturnType<typeof createAdminClient>;

    beforeEach(() => {
      vi.clearAllMocks();
      mockListUsers = vi.fn();
      mockSupabase = {
        auth: {
          admin: {
            listUsers: mockListUsers,
          },
        },
      } as unknown as ReturnType<typeof createAdminClient>;
    });

    it("should find user by email (case insensitive)", async () => {
      mockListUsers.mockResolvedValue({
        data: { users: mockUsers },
        error: null,
      });

      const result = await findUserByEmail(mockSupabase, "ADMIN@EXAMPLE.COM");

      expect(result).toEqual({ id: "user-1", email: "admin@example.com" });
    });

    it("should return null when user not found", async () => {
      mockListUsers.mockResolvedValue({
        data: { users: mockUsers },
        error: null,
      });

      const result = await findUserByEmail(mockSupabase, "notfound@example.com");

      expect(result).toBeNull();
    });

    it("should throw error when listUsers fails", async () => {
      mockListUsers.mockResolvedValue({
        data: null,
        error: { message: "Database connection failed" },
      });

      await expect(
        findUserByEmail(mockSupabase, "admin@example.com")
      ).rejects.toThrow("Failed to list users: Database connection failed");
    });
  });

  describe("assignAdminRole", () => {
    let mockFrom: Mock;
    let mockSelect: Mock;
    let mockEq: Mock;
    let mockSingle: Mock;
    let mockInsert: Mock;
    let mockSupabase: ReturnType<typeof createAdminClient>;

    beforeEach(() => {
      vi.clearAllMocks();

      mockSingle = vi.fn();
      mockEq = vi.fn();
      mockSelect = vi.fn();
      mockInsert = vi.fn();
      mockFrom = vi.fn();

      // Chain setup for select query
      mockSingle.mockReturnValue(Promise.resolve({ data: null, error: null }));
      mockEq.mockReturnValue({ eq: mockEq, single: mockSingle });
      mockSelect.mockReturnValue({ eq: mockEq });
      mockInsert.mockReturnValue(Promise.resolve({ error: null }));

      mockFrom.mockImplementation(() => ({
        select: mockSelect,
        insert: mockInsert,
      }));

      mockSupabase = {
        from: mockFrom,
      } as unknown as ReturnType<typeof createAdminClient>;
    });

    it("should create admin role when it does not exist", async () => {
      mockSingle.mockResolvedValue({ data: null, error: null });
      mockInsert.mockResolvedValue({ error: null });

      const result = await assignAdminRole(mockSupabase, "user-123");

      expect(result).toEqual({ created: true });
      expect(mockFrom).toHaveBeenCalledWith("user_roles");
      expect(mockInsert).toHaveBeenCalledWith({
        user_id: "user-123",
        role: "admin",
      });
    });

    it("should return created: false when role already exists", async () => {
      mockSingle.mockResolvedValue({
        data: { id: "existing-role" },
        error: null,
      });

      const result = await assignAdminRole(mockSupabase, "user-123");

      expect(result).toEqual({ created: false });
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it("should throw error when insert fails", async () => {
      mockSingle.mockResolvedValue({ data: null, error: null });
      mockInsert.mockResolvedValue({
        error: { message: "Unique constraint violation" },
      });

      await expect(assignAdminRole(mockSupabase, "user-123")).rejects.toThrow(
        "Failed to assign admin role: Unique constraint violation"
      );
    });
  });
});
