import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigationMocks = vi.hoisted(() => ({
  push: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

const actionMocks = vi.hoisted(() => ({
  updateProfileAction: vi.fn(),
  eraseAccountAction: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: navigationMocks.redirect,
  useRouter: () => ({
    push: navigationMocks.push,
    refresh: vi.fn(),
  }),
  // The profile mounts its own trail, which reads the address.
  usePathname: () => "/fr/compte/profil",
}));

vi.mock("@/lib/supabase/auth-server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

vi.mock("../actions", () => ({
  updateProfileAction: actionMocks.updateProfileAction,
  eraseAccountAction: actionMocks.eraseAccountAction,
}));

import { createServerSupabaseClient } from "@/lib/supabase/auth-server";
import ProfilePage from "../page";

type ProfileFixture = {
  display_name: string;
  public: boolean;
  created_at: string;
  age_confirmed_at: string | null;
};

function makeSupabaseClient({
  email = "amina@example.com",
  profile = {
    display_name: "Amina Diallo",
    public: true,
    created_at: "2026-01-15T12:00:00.000Z",
    age_confirmed_at: "2026-01-15T12:00:00.000Z",
  },
}: {
  email?: string;
  profile?: ProfileFixture;
} = {}) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: profile, error: null });
  const or = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ or });
  const from = vi.fn().mockReturnValue({ select });
  const getUser = vi.fn().mockResolvedValue({
    data: {
      user: {
        id: "user-123",
        email,
        created_at: "2025-12-01T12:00:00.000Z",
        user_metadata: {},
      },
    },
    error: null,
  });

  return {
    client: { auth: { getUser }, from },
    from,
    select,
    or,
    maybeSingle,
  };
}

async function renderPage() {
  const ui = await ProfilePage();
  return render(ui);
}

describe("ProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    actionMocks.updateProfileAction.mockResolvedValue({
      success: true,
      message: "Profil mis à jour.",
    });
    actionMocks.eraseAccountAction.mockResolvedValue({
      success: true,
      message: "Votre compte et vos données ont été supprimés.",
    });
  });

  // @req REQ-042
  it("redirects an unauthenticated visitor to the French sign-in page", async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: "No session" },
        }),
      },
      from: vi.fn(),
    } as never);

    await expect(ProfilePage()).rejects.toThrow(
      "NEXT_REDIRECT:/fr/compte/connexion"
    );
    expect(navigationMocks.redirect).toHaveBeenCalledWith(
      "/fr/compte/connexion"
    );
  });

  // @req REQ-042
  it("loads the profile by id or user_id and renders its private details", async () => {
    const { client, from, select, or, maybeSingle } = makeSupabaseClient();
    vi.mocked(createServerSupabaseClient).mockResolvedValue(client as never);

    await renderPage();

    expect(from).toHaveBeenCalledWith("contributor_profiles");
    expect(select).toHaveBeenCalledWith(
      "display_name, public, created_at, age_confirmed_at"
    );
    expect(or).toHaveBeenCalledWith("id.eq.user-123,user_id.eq.user-123");
    expect(maybeSingle).toHaveBeenCalled();
    expect(screen.getByDisplayValue("Amina Diallo")).toBeInTheDocument();
    expect(screen.getByText("am••••@example.com")).toBeInTheDocument();
    expect(screen.queryByText("amina@example.com")).not.toBeInTheDocument();
    expect(
      screen.getByRole("switch", { name: /profil public/i })
    ).toBeChecked();
    expect(screen.getByText("15 janvier 2026")).toBeInTheDocument();
    expect(screen.getByText("Confirmé")).toBeInTheDocument();
  });

  // @req REQ-042
  it("keeps one local-part character when masking a one-character email", async () => {
    const { client } = makeSupabaseClient({
      email: "q@example.org",
      profile: {
        display_name: "Qadir",
        public: false,
        created_at: "2026-02-01T12:00:00.000Z",
        age_confirmed_at: null,
      },
    });
    vi.mocked(createServerSupabaseClient).mockResolvedValue(client as never);

    await renderPage();

    expect(screen.getByText("q••••@example.org")).toBeInTheDocument();
    expect(
      screen.getByRole("switch", { name: /profil public/i })
    ).not.toBeChecked();
    expect(screen.getByText("Non confirmé")).toBeInTheDocument();
  });

  // @req REQ-042
  it("submits profile edits through the existing server action and shows feedback", async () => {
    const { client } = makeSupabaseClient();
    vi.mocked(createServerSupabaseClient).mockResolvedValue(client as never);
    await renderPage();

    fireEvent.change(screen.getByLabelText("Nom d’affichage"), {
      target: { value: "Nouveau nom" },
    });
    fireEvent.click(screen.getByRole("switch", { name: /profil public/i }));
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() => {
      expect(actionMocks.updateProfileAction).toHaveBeenCalledTimes(1);
    });

    const [previousState, formData] =
      actionMocks.updateProfileAction.mock.calls[0];
    expect(previousState).toEqual({ success: false, message: "" });
    expect(formData.get("display_name")).toBe("Nouveau nom");
    expect(formData.get("public")).toBe("off");
    expect(await screen.findByText("Profil mis à jour.")).toBeInTheDocument();
  });

  // @req REQ-042
  it("submits public=on after enabling an initially private profile", async () => {
    const { client } = makeSupabaseClient({
      profile: {
        display_name: "Amina Diallo",
        public: false,
        created_at: "2026-01-15T12:00:00.000Z",
        age_confirmed_at: "2026-01-15T12:00:00.000Z",
      },
    });
    vi.mocked(createServerSupabaseClient).mockResolvedValue(client as never);
    await renderPage();

    fireEvent.click(screen.getByRole("switch", { name: /profil public/i }));
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() => {
      expect(actionMocks.updateProfileAction).toHaveBeenCalledTimes(1);
    });

    const formData = actionMocks.updateProfileAction.mock.calls[0][1];
    expect(formData.get("public")).toBe("on");
  });

  // @req REQ-042
  it("requires exact erasure confirmation, shows feedback, and navigates home", async () => {
    const { client } = makeSupabaseClient();
    vi.mocked(createServerSupabaseClient).mockResolvedValue(client as never);
    await renderPage();

    fireEvent.click(
      screen.getByRole("button", { name: "Supprimer mon compte" })
    );

    expect(
      screen.getByText(
        "cette action est irréversible — vos signalements resteront publics sans votre nom"
      )
    ).toBeInTheDocument();

    const confirmation = screen.getByLabelText(
      "Saisissez SUPPRIMER pour confirmer"
    );
    const eraseButton = screen.getByRole("button", {
      name: "Supprimer définitivement",
    });

    expect(eraseButton).toBeDisabled();
    fireEvent.change(confirmation, { target: { value: "supprimer" } });
    expect(eraseButton).toBeDisabled();
    fireEvent.change(confirmation, { target: { value: "SUPPRIMER" } });
    expect(eraseButton).toBeEnabled();
    fireEvent.click(eraseButton);

    await waitFor(() => {
      expect(actionMocks.eraseAccountAction).toHaveBeenCalledTimes(1);
    });

    const [previousState, formData] =
      actionMocks.eraseAccountAction.mock.calls[0];
    expect(previousState).toEqual({ success: false, message: "" });
    expect(formData.get("confirmation")).toBe("SUPPRIMER");
    expect(
      await screen.findByText("Votre compte et vos données ont été supprimés.")
    ).toBeInTheDocument();
    expect(navigationMocks.push).toHaveBeenCalledWith("/fr");
  });
});
