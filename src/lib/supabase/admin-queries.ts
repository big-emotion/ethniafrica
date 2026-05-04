/**
 * Requêtes admin Supabase pour la modération
 */
import { createAdminClient } from "./admin";
import { logger } from "@/lib/api/logger";

export interface Contribution {
  id: string;
  type: string;
  status: "pending" | "approved" | "rejected";
  proposed_payload: Record<string, unknown>;
  contributor_email?: string;
  contributor_name?: string;
  notes?: string;
  moderator_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Obtenir toutes les contributions en attente
 */
export async function getPendingContributions(): Promise<Contribution[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("contributions")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    logger.error("Error fetching pending contributions", error);
    throw error;
  }

  return data || [];
}

/**
 * Obtenir toutes les contributions
 */
export async function getAllContributions(): Promise<Contribution[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("contributions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    logger.error("Error fetching contributions", error);
    throw error;
  }

  return data || [];
}

/**
 * Obtenir une contribution par ID
 */
export async function getContributionById(
  id: string
): Promise<Contribution | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("contributions")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    logger.error("Error fetching contribution", error);
    throw error;
  }

  return data;
}
