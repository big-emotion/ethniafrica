import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/auth-server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/auth-server";
import {
  eraseAccountAction,
  updateProfileAction,
  type ProfileActionState,
} from "../actions";

const previousState: ProfileActionState = { success: false, message: "" };

function makeProfileFormData(displayName: string, isPublic = false) {
  const formData = new FormData();
  formData.set("display_name", displayName);
  if (isPublic) {
    formData.set("public", "on");
  }
  return formData;
}

function makeAuthenticatedClient(updateError: object | null = null) {
  const or = vi.fn().mockResolvedValue({ error: updateError });
  const update = vi.fn().mockReturnValue({ or });
  const from = vi.fn().mockReturnValue({ update });
  const getUser = vi.fn().mockResolvedValue({
    data: { user: { id: "authenticated-user-id" } },
    error: null,
  });

  return {
    client: { auth: { getUser }, from },
    from,
    update,
    or,
  };
}

function makeUnauthenticatedClient() {
  const from = vi.fn();
  return {
    client: {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: "No session" },
        }),
      },
      from,
    },
    from,
  };
}

describe("updateProfileAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-042
  it("trims the display name and updates both profile fields for the authenticated user", async () => {
    const { client, from, update, or } = makeAuthenticatedClient();
    vi.mocked(createServerSupabaseClient).mockResolvedValue(client as never);

    const result = await updateProfileAction(
      previousState,
      makeProfileFormData("  Amina Diallo  ", true)
    );

    expect(result).toEqual({
      success: true,
      message: "Profil mis à jour.",
    });
    expect(from).toHaveBeenCalledWith("contributor_profiles");
    expect(update).toHaveBeenCalledWith({
      display_name: "Amina Diallo",
      public: true,
    });
    expect(or).toHaveBeenCalledWith(
      "id.eq.authenticated-user-id,user_id.eq.authenticated-user-id"
    );
  });

  // @req REQ-042
  it("updates the public toggle to false when the checkbox is absent", async () => {
    const { client, update } = makeAuthenticatedClient();
    vi.mocked(createServerSupabaseClient).mockResolvedValue(client as never);

    await updateProfileAction(
      previousState,
      makeProfileFormData("Amina Diallo")
    );

    expect(update).toHaveBeenCalledWith({
      display_name: "Amina Diallo",
      public: false,
    });
  });

  // @req REQ-042
  it.each(["A", "A".repeat(41)])(
    "rejects a trimmed display name outside 2–40 characters",
    async (displayName) => {
      const { client, from } = makeAuthenticatedClient();
      vi.mocked(createServerSupabaseClient).mockResolvedValue(client as never);

      const result = await updateProfileAction(
        previousState,
        makeProfileFormData(` ${displayName} `)
      );

      expect(result).toEqual({
        success: false,
        message: "Le nom d’affichage doit contenir entre 2 et 40 caractères.",
      });
      expect(from).not.toHaveBeenCalled();
    }
  );

  // @req REQ-042
  it("rejects curated profanity case-insensitively", async () => {
    const { client, from } = makeAuthenticatedClient();
    vi.mocked(createServerSupabaseClient).mockResolvedValue(client as never);

    const result = await updateProfileAction(
      previousState,
      makeProfileFormData("Sale CONNARD")
    );

    expect(result).toEqual({
      success: false,
      message: "Le nom d’affichage contient un terme interdit.",
    });
    expect(from).not.toHaveBeenCalled();
  });

  // @req REQ-042
  it.each(["Constance", "Scunthorpe"])(
    "does not reject a name merely containing a denied word fragment: %s",
    async (displayName) => {
      const { client, update } = makeAuthenticatedClient();
      vi.mocked(createServerSupabaseClient).mockResolvedValue(client as never);

      const result = await updateProfileAction(
        previousState,
        makeProfileFormData(displayName)
      );

      expect(result.success).toBe(true);
      expect(update).toHaveBeenCalled();
    }
  );

  // @req REQ-042
  it("does not update a profile without an authenticated user", async () => {
    const { client, from } = makeUnauthenticatedClient();
    vi.mocked(createServerSupabaseClient).mockResolvedValue(client as never);

    const result = await updateProfileAction(
      previousState,
      makeProfileFormData("Amina Diallo")
    );

    expect(result).toEqual({
      success: false,
      message: "Vous devez être connecté pour modifier votre profil.",
    });
    expect(from).not.toHaveBeenCalled();
  });

  // @req REQ-042
  it("returns user-facing feedback when the profile update fails", async () => {
    const { client } = makeAuthenticatedClient({
      message: "Database unavailable",
    });
    vi.mocked(createServerSupabaseClient).mockResolvedValue(client as never);

    const result = await updateProfileAction(
      previousState,
      makeProfileFormData("Amina Diallo")
    );

    expect(result).toEqual({
      success: false,
      message: "mise à jour échouée — merci de réessayer",
    });
  });
});

describe("eraseAccountAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-042
  it("requires the exact SUPPRIMER confirmation before authentication or admin access", async () => {
    const formData = new FormData();
    formData.set("confirmation", "supprimer");

    const result = await eraseAccountAction(previousState, formData);

    expect(result).toEqual({
      success: false,
      message: "Saisissez exactement SUPPRIMER pour confirmer.",
    });
    expect(createServerSupabaseClient).not.toHaveBeenCalled();
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  // @req REQ-042
  it("does not erase an account without an authenticated user", async () => {
    const { client } = makeUnauthenticatedClient();
    vi.mocked(createServerSupabaseClient).mockResolvedValue(client as never);
    const formData = new FormData();
    formData.set("confirmation", "SUPPRIMER");

    const result = await eraseAccountAction(previousState, formData);

    expect(result).toEqual({
      success: false,
      message: "Vous devez être connecté pour supprimer votre compte.",
    });
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  // @req REQ-042
  it("calls the server-only erasure RPC for the authenticated user", async () => {
    const { client } = makeAuthenticatedClient();
    const rpc = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(createServerSupabaseClient).mockResolvedValue(client as never);
    vi.mocked(createAdminClient).mockReturnValue({ rpc } as never);
    const formData = new FormData();
    formData.set("confirmation", "SUPPRIMER");

    const result = await eraseAccountAction(previousState, formData);

    expect(rpc).toHaveBeenCalledWith("erase_contributor_account", {
      target_user_id: "authenticated-user-id",
    });
    expect(result).toEqual({
      success: true,
      message: "Votre compte et vos données ont été supprimés.",
    });
  });

  // @req REQ-042
  it("returns the exact ticket feedback when the erasure transaction fails", async () => {
    const { client } = makeAuthenticatedClient();
    const rpc = vi.fn().mockResolvedValue({
      error: { message: "Transaction rolled back" },
    });
    vi.mocked(createServerSupabaseClient).mockResolvedValue(client as never);
    vi.mocked(createAdminClient).mockReturnValue({ rpc } as never);
    const formData = new FormData();
    formData.set("confirmation", "SUPPRIMER");

    const result = await eraseAccountAction(previousState, formData);

    expect(result).toEqual({
      success: false,
      message: "suppression échouée — merci de réessayer ou de nous contacter",
    });
  });
});
