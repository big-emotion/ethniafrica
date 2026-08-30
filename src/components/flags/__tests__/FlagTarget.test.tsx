import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FlagTarget } from "../FlagTarget";
import { createBrowserSupabaseClient } from "@/lib/supabase/auth-client";
import { useToast } from "@/hooks/use-toast";
import { useOptionalConsent } from "@/hooks/use-consent";

vi.mock("@/lib/supabase/auth-client", () => ({
  createBrowserSupabaseClient: vi.fn(),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: vi.fn(),
}));

vi.mock("@/hooks/use-consent", () => ({
  useOptionalConsent: vi.fn(),
}));

vi.mock("@/components/flags/TurnstileWidget", () => ({
  TurnstileWidget: ({
    onTokenChange,
  }: {
    onTokenChange: (token: string | null) => void;
  }) => (
    <button type="button" onClick={() => onTokenChange("test-turnstile-token")}>
      Valider le contrôle (test)
    </button>
  ),
}));

const toastMock = vi.fn();

function mockGetSession(session: unknown) {
  return vi.fn().mockResolvedValue({ data: { session } });
}

function mockSupabaseClient({
  session,
  ageConfirmedAt,
}: {
  session: unknown;
  ageConfirmedAt?: string | null;
}) {
  const maybeSingle = vi
    .fn()
    .mockResolvedValue({ data: { age_confirmed_at: ageConfirmedAt ?? null } });
  const or = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ or });
  const from = vi.fn().mockReturnValue({ select });

  const client = {
    auth: { getSession: mockGetSession(session) },
    from,
  };

  vi.mocked(createBrowserSupabaseClient).mockReturnValue(client as never);

  return { client, from, select, or, maybeSingle };
}

const assertionTarget = {
  type: "assertion",
  id: "assertion-1",
  fieldPath: "demographics.population",
  snapshotQuote: "Un million de locuteurs.",
};

const sectionTarget = {
  type: "fiche_section",
  id: "PPL_YORUBA",
  fieldPath: "histoire",
};

const sourceTarget = {
  type: "source",
  id: "SRC_42",
  snapshotQuote: "UNESCO, rapport 2025.",
};

function renderFlagTarget(overrides: Partial<{ target: unknown }> = {}) {
  return render(
    <FlagTarget
      target={(overrides.target as never) ?? assertionTarget}
      turnstileSiteKey="test-site-key"
    />
  );
}

describe("FlagTarget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    toastMock.mockReset();
    vi.mocked(useToast).mockReturnValue({
      toast: toastMock,
      dismiss: vi.fn(),
      toasts: [],
    } as never);
    vi.mocked(useOptionalConsent).mockReturnValue({
      consentState: {
        hasConsented: true,
        preferences: { essential: true, analytics: true, functional: true },
        consentDate: new Date().toISOString(),
      },
      acceptAll: vi.fn(),
      rejectAll: vi.fn(),
      updatePreferences: vi.fn(),
      showBanner: false,
      setShowBanner: vi.fn(),
    } as never);
    window.plausible = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { public_slug: "flag-abc123" } }),
      })
    );
  });

  // @req REQ-012
  it("renders a trigger button labeled Signaler", () => {
    mockSupabaseClient({ session: null });
    renderFlagTarget();

    expect(
      screen.getByRole("button", { name: /signaler/i })
    ).toBeInTheDocument();
  });

  /**
   * Reporting used to open on an account check and then an age check, and the
   * form only appeared to a reader who had cleared both. The sign-up path left
   * the page; the age confirmation had no screen that could grant it. Both
   * gates are gone (moderation charter §2): Turnstile is the control, and the
   * session only decides who the report is credited to.
   */
  describe("no gate before the form", () => {
    // @req REQ-012
    it("opens straight onto the form for a reader with no session", async () => {
      mockSupabaseClient({ session: null });
      renderFlagTarget();

      fireEvent.click(screen.getByRole("button", { name: /signaler/i }));

      expect(
        await screen.findByRole("button", { name: "Envoyer" })
      ).toBeInTheDocument();
      expect(screen.queryByRole("link", { name: /se connecter/i })).toBeNull();
    });

    // @req REQ-045
    it("opens straight onto the form when the account has not confirmed its age", async () => {
      mockSupabaseClient({
        session: { user: { id: "user-1" }, access_token: "token-1" },
        ageConfirmedAt: null,
      });
      renderFlagTarget();

      fireEvent.click(screen.getByRole("button", { name: /signaler/i }));

      expect(
        await screen.findByRole("button", { name: "Envoyer" })
      ).toBeInTheDocument();
      expect(
        screen.queryByText(/confirmer votre âge pour contribuer/i)
      ).toBeNull();
    });
  });

  describe("authenticated submission", () => {
    async function openAndReachForm() {
      mockSupabaseClient({
        session: { user: { id: "user-1" }, access_token: "token-1" },
        ageConfirmedAt: "2026-01-01T00:00:00.000Z",
      });
      renderFlagTarget();
      fireEvent.click(screen.getByRole("button", { name: /signaler/i }));
      await screen.findByRole("button", { name: "Envoyer" });
    }

    /**
     * The slug used to be written to the browser console, and this suite
     * asserted it. `no-console` does not reach client components, so the
     * debugging line survived review and shipped. The slug is what the
     * reporter needs, so it belongs on screen — not in a console nobody opens.
     */
    // @req REQ-012
    it("submits successfully, closes the dialog, toasts and fires analytics", async () => {
      const user = userEvent.setup();

      await openAndReachForm();

      await user.click(
        screen.getByRole("radio", { name: /contenu offensant/i })
      );
      await user.type(
        screen.getByLabelText("Raison du signalement"),
        "Cette explication contient assez de détails pour être examinée."
      );
      await user.click(
        screen.getByRole("button", { name: /valider le contrôle/i })
      );
      await user.click(screen.getByRole("button", { name: "Envoyer" }));

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });

      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ description: "signalement enregistré" })
      );
      expect(window.plausible).toHaveBeenCalledWith(
        "flag_submitted",
        expect.objectContaining({
          props: expect.objectContaining({ target_type: "assertion" }),
        })
      );
    });
  });

  describe("target.type branches", () => {
    /**
     * Each type reaches the dialog under its French label. It used to reach it
     * as `fiche_section · PPL_YORUBA` — the enum value and the corpus id, both
     * printed at a reporter being asked to confirm what they are flagging.
     * The id still travels in the payload, which is where the moderator reads
     * it; the assertions on that are further down this file.
     */
    // @req REQ-012
    it.each([
      ["assertion", assertionTarget, "Affirmation"],
      ["fiche_section", sectionTarget, "Section de fiche"],
      ["source", sourceTarget, "Source"],
    ])(
      "names target of type %s in French, without its identifier",
      async (_label, target, expectedText) => {
        mockSupabaseClient({
          session: { user: { id: "user-1" }, access_token: "token-1" },
          ageConfirmedAt: "2026-01-01T00:00:00.000Z",
        });
        renderFlagTarget({ target });

        fireEvent.click(screen.getByRole("button", { name: /signaler/i }));

        expect(await screen.findByText(expectedText)).toBeInTheDocument();
        expect(screen.queryByText(new RegExp(target.id))).toBeNull();
      }
    );
  });

  describe("keyboard focus trap", () => {
    // @req REQ-044
    it("keeps Tab focus inside the dialog while open", async () => {
      const user = userEvent.setup();
      mockSupabaseClient({ session: null });
      renderFlagTarget();

      await user.click(screen.getByRole("button", { name: /signaler/i }));
      const dialog = await screen.findByRole("dialog");

      for (let i = 0; i < 6; i++) {
        await user.tab();
        expect(dialog.contains(document.activeElement)).toBe(true);
      }
    });

    // @req REQ-044
    it("closes on Escape", async () => {
      const user = userEvent.setup();
      mockSupabaseClient({ session: null });
      renderFlagTarget();

      await user.click(screen.getByRole("button", { name: /signaler/i }));
      await screen.findByRole("dialog");

      await user.keyboard("{Escape}");

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
    });
  });
});
