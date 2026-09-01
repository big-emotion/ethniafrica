import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isEmailAllowlisted: vi.fn(),
  signInWithOtp: vi.fn(),
  headerGet: vi.fn(),
}));

vi.mock("@/lib/auth/adminAllowlist", () => ({
  isEmailAllowlisted: mocks.isEmailAllowlisted,
}));

vi.mock("@/lib/supabase/auth-server", () => ({
  createServerSupabaseClient: vi.fn(() =>
    Promise.resolve({ auth: { signInWithOtp: mocks.signInWithOtp } })
  ),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(() => Promise.resolve({ get: mocks.headerGet })),
}));

import { requestAdminSignInLink } from "../actions";

const NEUTRAL = {
  status: "sent",
  message:
    "Si cette adresse peut accéder à la modération, un lien vient de lui être envoyé.",
} as const;

function submit(email: string) {
  const form = new FormData();
  form.set("email", email);
  return requestAdminSignInLink({ status: "idle", message: "" }, form);
}

describe("requestAdminSignInLink", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.signInWithOtp.mockResolvedValue({ error: null });
    mocks.headerGet.mockImplementation((name: string) =>
      name === "host" ? "recette.africatlas.com" : "https"
    );
  });

  // @req REQ-042
  it("sends a link to an address the allowlist holds", async () => {
    mocks.isEmailAllowlisted.mockResolvedValue(true);

    await expect(submit("moderation@example.org")).resolves.toEqual(NEUTRAL);
    expect(mocks.signInWithOtp).toHaveBeenCalledWith({
      email: "moderation@example.org",
      options: {
        shouldCreateUser: true,
        emailRedirectTo:
          "https://recette.africatlas.com/api/auth/callback?redirect=%2Ffr%2Fadmin",
      },
    });
  });

  // @req REQ-042
  it("sends nothing to an address the allowlist does not hold", async () => {
    mocks.isEmailAllowlisted.mockResolvedValue(false);

    await submit("passante@example.org");

    expect(mocks.signInWithOtp).not.toHaveBeenCalled();
  });

  // @req REQ-042
  it("answers a stranger and a moderator with the very same words", async () => {
    mocks.isEmailAllowlisted.mockResolvedValue(true);
    const allowed = await submit("moderation@example.org");

    mocks.isEmailAllowlisted.mockResolvedValue(false);
    const refused = await submit("passante@example.org");

    expect(refused).toEqual(allowed);
  });

  // @req REQ-042
  it("keeps the neutral answer when Supabase refuses to send", async () => {
    mocks.isEmailAllowlisted.mockResolvedValue(true);
    mocks.signInWithOtp.mockResolvedValue({
      error: { message: "rate limit exceeded" },
    });

    await expect(submit("moderation@example.org")).resolves.toEqual(NEUTRAL);
  });

  // @req REQ-042
  it("rejects something that is not an address without consulting the allowlist", async () => {
    const result = await submit("pas-une-adresse");

    expect(result.status).toBe("invalid");
    expect(mocks.isEmailAllowlisted).not.toHaveBeenCalled();
    expect(mocks.signInWithOtp).not.toHaveBeenCalled();
  });

  // @req REQ-042
  it("looks up the address trimmed of surrounding space", async () => {
    mocks.isEmailAllowlisted.mockResolvedValue(true);

    await submit("  moderation@example.org  ");

    expect(mocks.isEmailAllowlisted).toHaveBeenCalledWith(
      "moderation@example.org"
    );
  });
});
