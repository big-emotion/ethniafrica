/**
 * Tests for getModeratorSession — FR41 / ETNI-66
 *
 * Coverage:
 *   - valid moderator session returns { user, role }
 *   - contributor with moderator_role = 'none' is rejected (redirect)
 *   - expired / missing session is rejected (redirect)
 *   - legacy env vars (ADMIN_USERNAME, ADMIN_PASSWORD) are absent from codebase
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Mock next/navigation redirect (throws in server components / middleware)
// vi.hoisted ensures the variable is available when vi.mock factory runs.
// ---------------------------------------------------------------------------
const { mockRedirect } = vi.hoisted(() => {
  const mockRedirect = vi.fn((url: string): never => {
    throw new Error(`REDIRECT:${url}`);
  });
  return { mockRedirect };
});

vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

// ---------------------------------------------------------------------------
// Mock createServerSupabaseClient
// ---------------------------------------------------------------------------
const mockGetUser = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();

vi.mock("@/lib/supabase/auth-server", () => ({
  createServerSupabaseClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
      from: vi.fn(() => ({
        select: mockSelect,
      })),
    })
  ),
}));

import { getModeratorSession } from "../moderator";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setupValidSession(moderatorRole: string) {
  const user = { id: "user-uuid-123", email: "mod@example.com" };
  mockGetUser.mockResolvedValue({ data: { user }, error: null });
  mockSelect.mockReturnValue({
    eq: mockEq,
  });
  mockEq.mockResolvedValue({
    data: [{ moderator_role: moderatorRole }],
    error: null,
  });
  return user;
}

function setupNoSession() {
  mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
}

function setupExpiredSession() {
  mockGetUser.mockResolvedValue({
    data: { user: null },
    error: { message: "JWT expired" },
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("getModeratorSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns { user, role } for a valid moderator session (editor)", async () => {
    const user = setupValidSession("editor");

    const session = await getModeratorSession();

    expect(session).toEqual({ user, role: "editor" });
  });

  it("returns { user, role } for a valid moderator session (senior_editor)", async () => {
    const user = setupValidSession("senior_editor");

    const session = await getModeratorSession();

    expect(session).toEqual({ user, role: "senior_editor" });
  });

  it("returns { user, role } for a valid moderator session (admin)", async () => {
    const user = setupValidSession("admin");

    const session = await getModeratorSession();

    expect(session).toEqual({ user, role: "admin" });
  });

  it("throws redirect when contributor has moderator_role = 'none'", async () => {
    setupValidSession("none");

    await expect(getModeratorSession()).rejects.toThrow(
      "REDIRECT:/fr/compte/connexion"
    );
  });

  it("throws redirect when no session (unauthenticated)", async () => {
    setupNoSession();

    await expect(getModeratorSession()).rejects.toThrow(
      "REDIRECT:/fr/compte/connexion"
    );
  });

  it("throws redirect when session is expired", async () => {
    setupExpiredSession();

    await expect(getModeratorSession()).rejects.toThrow(
      "REDIRECT:/fr/compte/connexion"
    );
  });

  it("throws redirect when contributor_profiles row is missing", async () => {
    const user = { id: "user-uuid-no-profile", email: "nobody@example.com" };
    mockGetUser.mockResolvedValue({ data: { user }, error: null });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockResolvedValue({ data: [], error: null });

    await expect(getModeratorSession()).rejects.toThrow(
      "REDIRECT:/fr/compte/connexion"
    );
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
