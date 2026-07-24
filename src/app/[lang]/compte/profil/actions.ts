"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/auth-server";

export type ProfileActionState = {
  success: boolean;
  message: string;
};

const PROFANITY_DENY_LIST = new Set([
  "asshole",
  "bastard",
  "bitch",
  "con",
  "connard",
  "connasse",
  "cunt",
  "encule",
  "enculé",
  "enculee",
  "enculée",
  "fuck",
  "fucker",
  "merde",
  "nique",
  "niquer",
  "putain",
  "pute",
  "salaud",
  "salope",
  "shit",
]);

function hasProfanity(displayName: string) {
  const words = displayName
    .normalize("NFKC")
    .toLocaleLowerCase("fr")
    .match(/\p{L}+/gu);

  return words?.some((word) => PROFANITY_DENY_LIST.has(word)) ?? false;
}

function validateDisplayName(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return {
      valid: false,
      displayName: "",
      message: "Le nom d’affichage doit contenir entre 2 et 40 caractères.",
    };
  }

  const displayName = value.trim();
  const characterCount = Array.from(displayName).length;

  if (characterCount < 2 || characterCount > 40) {
    return {
      valid: false,
      displayName,
      message: "Le nom d’affichage doit contenir entre 2 et 40 caractères.",
    };
  }

  if (hasProfanity(displayName)) {
    return {
      valid: false,
      displayName,
      message: "Le nom d’affichage contient un terme interdit.",
    };
  }

  return { valid: true, displayName, message: "" };
}

// @req REQ-042
export async function updateProfileAction(
  _previousState: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  const validation = validateDisplayName(formData.get("display_name"));

  if (!validation.valid) {
    return { success: false, message: validation.message };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        message: "Vous devez être connecté pour modifier votre profil.",
      };
    }

    const { error } = await supabase
      .from("contributor_profiles")
      .update({
        display_name: validation.displayName,
        public: formData.get("public") === "on",
      })
      .or(`id.eq.${user.id},user_id.eq.${user.id}`);

    if (error) {
      return {
        success: false,
        message: "mise à jour échouée — merci de réessayer",
      };
    }

    return { success: true, message: "Profil mis à jour." };
  } catch {
    return {
      success: false,
      message: "mise à jour échouée — merci de réessayer",
    };
  }
}

// @req REQ-042
export async function eraseAccountAction(
  _previousState: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  if (formData.get("confirmation") !== "SUPPRIMER") {
    return {
      success: false,
      message: "Saisissez exactement SUPPRIMER pour confirmer.",
    };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        message: "Vous devez être connecté pour supprimer votre compte.",
      };
    }

    const admin = createAdminClient();
    const { error } = await admin.rpc("erase_contributor_account", {
      target_user_id: user.id,
    });

    if (error) {
      return {
        success: false,
        message:
          "suppression échouée — merci de réessayer ou de nous contacter",
      };
    }

    return {
      success: true,
      message: "Votre compte et vos données ont été supprimés.",
    };
  } catch {
    return {
      success: false,
      message: "suppression échouée — merci de réessayer ou de nous contacter",
    };
  }
}
