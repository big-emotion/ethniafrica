import { createServerClient } from "@/lib/supabase/server";
import type { Revision, InsertRevisionInput } from "@/api/v2/schemas/revisions";

export async function insertRevision(
  input: InsertRevisionInput
): Promise<Revision> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("revisions")
    .insert(input)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to insert revision: ${error.message}`);
  }
  return data as Revision;
}

export async function getRevision(id: string): Promise<Revision | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("revisions")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load revision ${id}: ${error.message}`);
  }
  if (!data) return null;
  return data as Revision;
}
