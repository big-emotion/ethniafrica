import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigationMocks = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: navigationMocks.redirect,
  usePathname: () => "/fr/compte/cles-api",
}));

vi.mock("@/lib/supabase/auth-server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

vi.mock("@/api/v2/services/keyService", () => ({
  listUserApiKeys: vi.fn(),
}));

import { listUserApiKeys } from "@/api/v2/services/keyService";
import { createServerSupabaseClient } from "@/lib/supabase/auth-server";
import ApiKeysPage from "../page";

function makeSupabaseClient(userId = "user-123") {
  const getUser = vi.fn().mockResolvedValue({
    data: { user: { id: userId } },
    error: null,
  });

  return { auth: { getUser } };
}

async function renderPage() {
  const ui = await ApiKeysPage();
  return render(ui);
}

describe("ApiKeysPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-056
  it("redirects an unauthenticated visitor to the French sign-in page", async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: "No session" },
        }),
      },
    } as never);

    await expect(ApiKeysPage()).rejects.toThrow(
      "NEXT_REDIRECT:/fr/compte/connexion"
    );
    expect(navigationMocks.redirect).toHaveBeenCalledWith(
      "/fr/compte/connexion"
    );
  });

  // @req REQ-056
  it("loads the caller's own keys and renders the manager", async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      makeSupabaseClient("user-123") as never
    );
    vi.mocked(listUserApiKeys).mockResolvedValue([
      {
        id: "key-1",
        label: "CI pipeline",
        tier: "public",
        active: true,
        key_prefix: "usr_abcd1234",
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
