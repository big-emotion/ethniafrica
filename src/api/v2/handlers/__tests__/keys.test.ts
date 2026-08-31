import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  handleKeyCreate,
  handleKeyList,
  handleKeyRevoke,
} from "@/api/v2/handlers/keys";

const user = { id: "user-1" };

const keySummary = {
  id: "key-1",
  label: "CI script",
  tier: "public" as const,
  active: true,
  key_prefix: "usr_abcdef012345678901", // gitleaks:allow
  created_at: "2026-01-01T00:00:00.000Z",
  last_used_at: null,
  expires_at: null,
  revoked_at: null,
};

function makeDependencies() {
  return {
    getAuthenticatedUser: vi.fn().mockResolvedValue(user),
    listUserApiKeys: vi.fn().mockResolvedValue([keySummary]),
    createUserApiKey: vi
      .fn()
      .mockResolvedValue({ ...keySummary, key: "usr_rawvalue" }),
    revokeUserApiKey: vi.fn().mockResolvedValue("revoked" as const),
  };
}

describe("key handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("handleKeyList", () => {
    // @req REQ-056
    it("returns 401 without an access token", async () => {
      const dependencies = makeDependencies();
      const result = await handleKeyList({ accessToken: null }, dependencies);

      expect(result.status).toBe(401);
      expect(dependencies.listUserApiKeys).not.toHaveBeenCalled();
    });

    // @req REQ-056
    it("returns 401 when the token does not resolve to a user", async () => {
      const dependencies = makeDependencies();
      dependencies.getAuthenticatedUser.mockResolvedValue(null);

      const result = await handleKeyList(
        { accessToken: "invalid" },
        dependencies
      );

      expect(result.status).toBe(401);
    });

    // @req REQ-056
    it("returns the caller's own keys", async () => {
      const dependencies = makeDependencies();
      const result = await handleKeyList(
        { accessToken: "valid-jwt" },
        dependencies
      );

      expect(result.status).toBe(200);
      expect(result.body).toMatchObject({ data: [keySummary] });
      expect(dependencies.listUserApiKeys).toHaveBeenCalledWith(user.id);
    });
  });

  describe("handleKeyCreate", () => {
    // @req REQ-056
    it("returns 401 without an access token", async () => {
      const dependencies = makeDependencies();
      const result = await handleKeyCreate(
        { accessToken: null },
        { label: "Local dev" },
        dependencies
      );

      expect(result.status).toBe(401);
      expect(dependencies.createUserApiKey).not.toHaveBeenCalled();
    });

    // @req REQ-056
    it("returns 400 when the label is missing", async () => {
      const dependencies = makeDependencies();
      const result = await handleKeyCreate(
        { accessToken: "valid-jwt" },
        {},
        dependencies
      );

      expect(result.status).toBe(400);
      expect(dependencies.createUserApiKey).not.toHaveBeenCalled();
    });

    // @req REQ-056
    it("creates a key scoped to the caller and returns the raw key once", async () => {
      const dependencies = makeDependencies();
      const result = await handleKeyCreate(
        { accessToken: "valid-jwt" },
        { label: "Local dev" },
        dependencies
      );

      expect(result.status).toBe(201);
      expect(dependencies.createUserApiKey).toHaveBeenCalledWith(
        user.id,
        "Local dev"
      );
      expect(result.body).toMatchObject({
        data: { key: "usr_rawvalue" },
      });
    });
  });

  describe("handleKeyRevoke", () => {
    // @req REQ-056
    it("returns 401 without an access token", async () => {
      const dependencies = makeDependencies();
      const result = await handleKeyRevoke(
        { accessToken: null },
        "key-1",
        dependencies
      );

      expect(result.status).toBe(401);
      expect(dependencies.revokeUserApiKey).not.toHaveBeenCalled();
    });

    // @req REQ-056
    it("returns 404 when the key is not owned by the caller", async () => {
      const dependencies = makeDependencies();
      dependencies.revokeUserApiKey.mockResolvedValue("not_found" as const);

      const result = await handleKeyRevoke(
        { accessToken: "valid-jwt" },
        "someone-elses-key",
        dependencies
      );

      expect(result.status).toBe(404);
    });

    // @req REQ-056
    it("revokes the caller's key", async () => {
      const dependencies = makeDependencies();
      const result = await handleKeyRevoke(
        { accessToken: "valid-jwt" },
        "key-1",
        dependencies
      );

      expect(result.status).toBe(200);
      expect(dependencies.revokeUserApiKey).toHaveBeenCalledWith(
        user.id,
        "key-1"
      );
    });
  });
});
