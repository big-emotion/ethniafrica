import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigationMocks = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: navigationMocks.redirect,
  usePathname: () => "/fr/admin/cles-api",
}));

vi.mock("@/lib/supabase/moderator", () => ({
  getModeratorSession: vi.fn(),
}));

vi.mock("@/api/v2/services/keyService", () => ({
  listUserApiKeys: vi.fn(),
}));

import { listUserApiKeys } from "@/api/v2/services/keyService";
import { getModeratorSession } from "@/lib/supabase/moderator";
import ApiKeysPage from "../page";

async function renderPage() {
  const ui = await ApiKeysPage();
  return render(ui);
}

describe("ApiKeysPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-056
  it("turns away anyone the admin allowlist does not hold", async () => {
    vi.mocked(getModeratorSession).mockImplementation(() => {
      navigationMocks.redirect("/fr/admin/connexion");
      return Promise.reject(new Error("unreachable"));
    });

    await expect(ApiKeysPage()).rejects.toThrow(
      "NEXT_REDIRECT:/fr/admin/connexion"
    );
    expect(listUserApiKeys).not.toHaveBeenCalled();
  });

  // @req REQ-056
  it("loads the caller's own keys and renders the manager", async () => {
    vi.mocked(getModeratorSession).mockResolvedValue({
      user: { id: "user-123" },
    } as never);
    vi.mocked(listUserApiKeys).mockResolvedValue([
      {
        id: "key-1",
        label: "CI pipeline",
        tier: "public",
        active: true,
        key_prefix: "usr_abcd1234", // gitleaks:allow
        created_at: "2026-01-15T12:00:00.000Z",
        last_used_at: null,
        expires_at: null,
        revoked_at: null,
      },
    ]);

    await renderPage();

    expect(listUserApiKeys).toHaveBeenCalledWith("user-123");
    expect(screen.getByText("CI pipeline")).toBeInTheDocument();
  });
});
