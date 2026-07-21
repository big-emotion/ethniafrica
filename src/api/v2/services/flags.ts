import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/api/logger";

export interface FlagCreateInput {
  entity_type: string;
  entity_id: string;
  flag_kind: string;
  reason_text?: string;
  contributor_id: string;
}

export async function getAgeConfirmedAt(
  userId: string
): Promise<string | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("contributor_profiles")
    .select("age_confirmed_at")
    .eq("id", userId)
    .single();

  if (error) {
    logger.error(
      "Failed to read contributor profile for age gate check",
      error
    );
    return null;
  }

  return (
    (data as { age_confirmed_at: string | null })?.age_confirmed_at ?? null
  );
}

export async function insertFlag(
  input: FlagCreateInput
): Promise<{ id: string }> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("flags")
    .insert({
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      flag_kind: input.flag_kind,
      reason_text: input.reason_text ?? null,
      contributor_id: input.contributor_id,
      status: "open",
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to insert flag: ${error.message}`);
  }

  return data as { id: string };
}
