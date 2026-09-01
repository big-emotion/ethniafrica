/**
 * Tests for getModeratorSession.
 *
 * Authorization moved from `contributor_profiles.moderator_role` to the
 * `admin_allowlist` table: the atlas has no public accounts any more, so the
 * gate has to attach to something that exists before anyone signs in.
 */
// @req REQ-041
// @req REQ-055
// @req REQ-082
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Mock next/navigation redirect (throws in server components / middleware)
// vi.hoisted ensures the variable is available when vi.mock factory runs.
// ---------------------------------------------------------------------------
const { mockRedirect, mockIsEmailAllowlisted } = vi.hoisted(() => {
  const mockRedirect = vi.fn((url: string): never => {
    throw new Error(`REDIRECT:${url}`);
  });
  return { mockRedirect, mockIsEmailAllowlisted: vi.fn() };
});

vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

vi.mock("@/lib/auth/adminAllowlist", () => ({
  isEmailAllowlisted: mockIsEmailAllowlisted,
}));

// ---------------------------------------------------------------------------
// Mock createServerSupabaseClient
// ---------------------------------------------------------------------------
const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/auth-server", () => ({
  createServerSupabaseClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
    })
  ),
}));

import { getModeratorSession } from "../moderator";

const SIGN_IN = "REDIRECT:/fr/admin/connexion";

function signedInAs(email: string) {
  const user = { id: "user-uuid-123", email };
  mockGetUser.mockResolvedValue({ data: { user }, error: null });
  return user;
}

describe("getModeratorSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-042
  it("returns the session for an address the allowlist holds", async () => {
    const user = signedInAs("moderatrice@example.org");
    mockIsEmailAllowlisted.mockResolvedValue(true);

    await expect(getModeratorSession()).resolves.toEqual({ user });
  });

  // @req REQ-042
  it("sends a signed-in stranger back to the sign-in page", async () => {
    signedInAs("passante@example.org");
    mockIsEmailAllowlisted.mockResolvedValue(false);

    await expect(getModeratorSession()).rejects.toThrow(SIGN_IN);
  });

  // @req REQ-042
  it("checks the address that is actually signed in", async () => {
    signedInAs("moderatrice@example.org");
    mockIsEmailAllowlisted.mockResolvedValue(true);

    await getModeratorSession();

    expect(mockIsEmailAllowlisted).toHaveBeenCalledWith(
      "moderatrice@example.org"
    );
  });

  // @req REQ-042
  it("refuses when there is no session at all", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    await expect(getModeratorSession()).rejects.toThrow(SIGN_IN);
    expect(mockIsEmailAllowlisted).not.toHaveBeenCalled();
  });

  // @req REQ-042
  it("refuses when the session has expired", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "JWT expired" },
    });

    await expect(getModeratorSession()).rejects.toThrow(SIGN_IN);
  });

  // @req REQ-042
  it("refuses a session carrying no address to check", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-uuid-123", email: null } },
      error: null,
    });
    mockIsEmailAllowlisted.mockResolvedValue(false);

    await expect(getModeratorSession()).rejects.toThrow(SIGN_IN);
  });
});

// ---------------------------------------------------------------------------
// Static: legacy env vars must not appear in any source file
// ---------------------------------------------------------------------------

describe("legacy env-var absence", () => {
  function collectSourceFiles(dir: string, files: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        if (
          ["node_modules", ".git", ".next", "dist", "__tests__"].includes(entry)
        )
          continue;
        collectSourceFiles(full, files);
      } else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry)) {
        files.push(full);
      }
    }
    return files;
  }

  it("ADMIN_USERNAME is not referenced in any source file", () => {
    // __dirname = src/lib/supabase/__tests__ → ../../../ = src/
    const sources = collectSourceFiles(path.resolve(__dirname, "../../../"));
    const matches = sources.filter((f) =>
      readFileSync(f, "utf-8").includes("ADMIN_USERNAME")
    );
    expect(
      matches,
      `Files still referencing ADMIN_USERNAME: ${matches.join(", ")}`
    ).toHaveLength(0);
  });

  it("ADMIN_PASSWORD is not referenced in any source file", () => {
    const sources = collectSourceFiles(path.resolve(__dirname, "../../../"));
    const matches = sources.filter((f) =>
      readFileSync(f, "utf-8").includes("ADMIN_PASSWORD")
    );
    expect(
      matches,
      `Files still referencing ADMIN_PASSWORD: ${matches.join(", ")}`
    ).toHaveLength(0);
  });
});
