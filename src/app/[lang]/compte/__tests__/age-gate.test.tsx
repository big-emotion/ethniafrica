import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NextRequest } from "next/server";
import React from "react";

vi.mock("next/navigation", () => ({
  useParams: vi.fn(() => ({ lang: "fr" })),
}));
vi.mock("@/hooks/use-language", () => ({
  useLanguage: vi.fn(() => ({ language: "fr", setLanguage: vi.fn() })),
}));
vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));
vi.mock("@/lib/supabase/auth-client", () => ({
  createBrowserSupabaseClient: vi.fn(),
}));
vi.mock("@/lib/supabase/auth-server", () => ({
  createServerSupabaseClient: vi.fn(),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

import { createBrowserSupabaseClient } from "@/lib/supabase/auth-client";
import { createServerSupabaseClient } from "@/lib/supabase/auth-server";
import { createAdminClient } from "@/lib/supabase/admin";
import InscriptionPage from "../inscription/page";
import { GET as callbackGET } from "@/app/api/auth/callback/route";
import { POST as flagPOST } from "@/app/api/v2/flags/route";

// ── helpers ─────────────────────────────────────────────────────────────────

function makeBrowserSupabaseMock() {
  const signInWithOtp = vi.fn().mockResolvedValue({ error: null });
  const signInWithOAuth = vi.fn().mockResolvedValue({ data: {}, error: null });
  return {
    client: { auth: { signInWithOtp, signInWithOAuth } },
    signInWithOtp,
  };
}

function makeCallbackServerMock(user: object | null, withAgeUpdate = false) {
  const mockIs = vi.fn().mockResolvedValue({ error: null });
  const mockEq = vi.fn().mockReturnValue({ is: mockIs });
  const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
  const mockUpsert = vi.fn().mockResolvedValue({ error: null });
  const mockFrom = vi.fn().mockReturnValue({
    upsert: mockUpsert,
    update: mockUpdate,
  });
  return {
    auth: {
      exchangeCodeForSession: vi.fn().mockResolvedValue({
        data: { user },
        error: null,
      }),
    },
    from: mockFrom,
    _update: mockUpdate,
    _upsert: mockUpsert,
  };
}

function makeAdminMock(ageConfirmedAt: string | null) {
  const singleFn = vi.fn().mockResolvedValue({
    data: { age_confirmed_at: ageConfirmedAt },
    error: null,
  });
  const eqFn = vi.fn().mockReturnValue({ single: singleFn });
  const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
  const insertFn = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      single: vi
        .fn()
        .mockResolvedValue({ data: { id: "flag-uuid" }, error: null }),
    }),
  });
  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "contributor_profiles") return { select: selectFn };
      return { insert: insertFn };
    }),
  };
}

function makeAuthServerMock(userId = "user-1") {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      }),
    },
  };
}

// ── 1 & 2 — InscriptionPage: age-gate checkbox ──────────────────────────────

describe("InscriptionPage — age-gate checkbox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const { client } = makeBrowserSupabaseMock();
    vi.mocked(createBrowserSupabaseClient).mockReturnValue(client as never);
  });

  it("renders the age-gate checkbox with 16+ label text", () => {
    render(<InscriptionPage />);
    expect(screen.getByText(/16 ans ou plus/i)).toBeTruthy();
  });

  it("blocks submission and shows 'cette confirmation est requise' when age checkbox is unchecked", async () => {
    const { client, signInWithOtp } = makeBrowserSupabaseMock();
    vi.mocked(createBrowserSupabaseClient).mockReturnValue(client as never);

    render(<InscriptionPage />);

    // Fill email
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "test@example.com" },
    });

    // Check the CC-BY-SA consent but NOT the age-gate checkbox
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]); // consent checkbox (first)

    // Submit
    fireEvent.click(screen.getByRole("button", { name: /lien magique/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toMatch(
        /cette confirmation est requise/i
      );
    });

    expect(signInWithOtp).not.toHaveBeenCalled();
  });
});

// ── 3 — Auth callback: age_confirmed_at ─────────────────────────────────────

describe("GET /api/auth/callback — age_confirmed_at", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets age_confirmed_at when age_confirmed=1 is present", async () => {
    const user = {
      id: "user-uuid-age",
      email: "age@example.com",
      user_metadata: {},
    };
    const mock = makeCallbackServerMock(user);
    vi.mocked(createServerSupabaseClient).mockResolvedValue(mock as never);

    await callbackGET(
      new NextRequest(
        "http://localhost/api/auth/callback?code=c&redirect=/fr/compte/profil&age_confirmed=1"
      )
    );

    expect(mock._update).toHaveBeenCalledWith(
      expect.objectContaining({ age_confirmed_at: expect.any(String) })
    );
  });

  it("does NOT call update when age_confirmed param is absent", async () => {
    const user = {
      id: "user-uuid-noage",
      email: "noage@example.com",
      user_metadata: {},
    };
    const mock = makeCallbackServerMock(user);
    vi.mocked(createServerSupabaseClient).mockResolvedValue(mock as never);

    await callbackGET(
      new NextRequest(
        "http://localhost/api/auth/callback?code=c&redirect=/fr/compte/profil"
      )
    );

    expect(mock._update).not.toHaveBeenCalled();
  });
});

// ── 4 — POST /api/v2/flags: age gate guard ──────────────────────────────────

describe("POST /api/v2/flags — age gate guard", () => {
  const validBody = {
    entity_type: "people",
    entity_id: "PPL_YORUBA",
    flag_kind: "inaccurate",
    reason_text: "Incorrect claim",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when contributor has no age_confirmed_at", async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      makeAuthServerMock() as never
    );
    vi.mocked(createAdminClient).mockReturnValue(makeAdminMock(null) as never);

    const res = await flagPOST(
      new NextRequest("http://localhost/api/v2/flags", {
        method: "POST",
        body: JSON.stringify(validBody),
        headers: { "content-type": "application/json" },
      })
    );

    expect(res.status).toBe(403);
  });

  it("returns 201 when contributor has age_confirmed_at set", async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      makeAuthServerMock() as never
    );
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdminMock("2026-01-01T00:00:00Z") as never
    );

    const res = await flagPOST(
      new NextRequest("http://localhost/api/v2/flags", {
        method: "POST",
        body: JSON.stringify(validBody),
        headers: { "content-type": "application/json" },
      })
    );

    expect(res.status).toBe(201);
  });
});
