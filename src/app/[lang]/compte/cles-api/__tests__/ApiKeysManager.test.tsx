import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/auth-client", () => ({
  createBrowserSupabaseClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: "session-jwt" } },
      }),
    },
  }),
}));

import { ApiKeysManager } from "../ApiKeysManager";

const existingKey = {
  id: "key-1",
  label: "CI pipeline",
  tier: "public" as const,
  active: true,
  key_prefix: "usr_abcd1234", // gitleaks:allow
  created_at: "2026-01-15T12:00:00.000Z",
  last_used_at: null,
  expires_at: null,
  revoked_at: null,
};

function stubFetch(response: { ok: boolean; status?: number; body: unknown }) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status ?? (response.ok ? 200 : 400),
    json: async () => response.body,
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("ApiKeysManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-056
  it("tells the reader they have no keys yet", () => {
    render(<ApiKeysManager initialKeys={[]} />);

    expect(
      screen.getByText(/vous n.avez pas encore de clé api/i)
    ).toBeInTheDocument();
  });

  // @req REQ-056
  it("lists the caller's existing keys by prefix, never the raw key", () => {
    render(<ApiKeysManager initialKeys={[existingKey]} />);

    expect(screen.getByText("CI pipeline")).toBeInTheDocument();
    expect(screen.getByText(/usr_abcd1234/)).toBeInTheDocument();
  });

  // @req REQ-056
  it("creates a key with the session token and reveals the raw key once", async () => {
    const fetchMock = stubFetch({
      ok: true,
      body: {
        data: {
          id: "key-2",
          label: "Local dev",
          tier: "public",
          active: true,
          key_prefix: "usr_zzzz9999",
          created_at: "2026-02-01T00:00:00.000Z",
          last_used_at: null,
          expires_at: null,
          revoked_at: null,
          key: "usr_zzzz9999_rawsecret",
        },
      },
    });

    render(<ApiKeysManager initialKeys={[]} />);

    fireEvent.change(screen.getByLabelText(/nom de la clé/i), {
      target: { value: "Local dev" },
    });
    fireEvent.click(screen.getByRole("button", { name: /créer une clé/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v2/keys");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer session-jwt");
    expect(JSON.parse(init.body)).toEqual({ label: "Local dev" });

    expect(await screen.findByLabelText(/nouvelle clé api/i)).toHaveValue(
      "usr_zzzz9999_rawsecret"
    );
    expect(screen.getByText(/usr_zzzz9999/)).toBeInTheDocument();
  });

  // @req REQ-056
  it("shows the API's own validation message when creation fails", async () => {
    stubFetch({
      ok: false,
      body: { errors: [{ code: "VALIDATION_ERROR", message: "trop court" }] },
    });

    render(<ApiKeysManager initialKeys={[]} />);

    fireEvent.change(screen.getByLabelText(/nom de la clé/i), {
      target: { value: "x" },
    });
    fireEvent.click(screen.getByRole("button", { name: /créer une clé/i }));

    expect(await screen.findByText("trop court")).toBeInTheDocument();
  });

  // @req REQ-056
  it("hides the raw key once the reader dismisses the reveal card", async () => {
    stubFetch({
      ok: true,
      body: {
        data: {
          id: "key-2",
          label: "Local dev",
          tier: "public",
          active: true,
          key_prefix: "usr_zzzz9999",
          created_at: "2026-02-01T00:00:00.000Z",
          last_used_at: null,
          expires_at: null,
          revoked_at: null,
          key: "usr_zzzz9999_rawsecret",
        },
      },
    });

    render(<ApiKeysManager initialKeys={[]} />);

    fireEvent.change(screen.getByLabelText(/nom de la clé/i), {
      target: { value: "Local dev" },
    });
    fireEvent.click(screen.getByRole("button", { name: /créer une clé/i }));

    await screen.findByLabelText(/nouvelle clé api/i);
    fireEvent.click(
      screen.getByRole("button", { name: /copié la clé, la masquer/i })
    );

    expect(
      screen.queryByLabelText(/nouvelle clé api/i)
    ).not.toBeInTheDocument();
  });

  // @req REQ-056
  it("revokes a key after the reader confirms, with the session token", async () => {
    const fetchMock = stubFetch({
      ok: true,
      body: { data: null },
    });

    render(<ApiKeysManager initialKeys={[existingKey]} />);

    fireEvent.click(screen.getByRole("button", { name: /révoquer/i }));
    fireEvent.click(
      screen.getByRole("button", { name: /confirmer la révocation/i })
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v2/keys/key-1");
    expect(init.method).toBe("DELETE");
    expect(init.headers.Authorization).toBe("Bearer session-jwt");

    expect(await screen.findByText(/révoquée/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /révoquer/i })
    ).not.toBeInTheDocument();
  });

  // @req REQ-056
  it("says so when revocation fails", async () => {
    stubFetch({
      ok: false,
      body: { errors: [{ code: "NOT_FOUND", message: "clé introuvable" }] },
    });

    render(<ApiKeysManager initialKeys={[existingKey]} />);

    fireEvent.click(screen.getByRole("button", { name: /révoquer/i }));
    fireEvent.click(
      screen.getByRole("button", { name: /confirmer la révocation/i })
    );

    expect(await screen.findByText("clé introuvable")).toBeInTheDocument();
  });
});
