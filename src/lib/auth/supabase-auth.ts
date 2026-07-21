/**
 * Supabase Auth utilities for user authentication and role management
 */
import type { User } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "../supabase/auth-server";

export type UserRole =
  | "reader"
  | "contributor"
  | "moderator"
  | "admin"
  | "advisor";

export interface UserRoleRecord {
  user_id: string;
  role: UserRole;
  created_at: string;
}

/**
 * Get the currently authenticated user from the session
 * Returns null if no user is authenticated
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

/**
 * Fetch all roles for a given user from the user_roles table
 * @param userId - The user's UUID
 * @returns Array of UserRole values
 */
export async function getUserRoles(userId: string): Promise<UserRole[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (error || !data) {
    return [];
  }

  return data.map((record: { role: UserRole }) => record.role);
}

/**
 * Check if a user has a specific role
 * @param userId - The user's UUID
 * @param role - The role to check for
 * @returns true if the user has the role, false otherwise
 */
export async function hasRole(
  userId: string,
  role: UserRole
): Promise<boolean> {
  const roles = await getUserRoles(userId);
  return roles.includes(role);
}

/**
 * Check if a user has the admin role
 * Shorthand for hasRole(userId, 'admin')
 * @param userId - The user's UUID
 * @returns true if the user is an admin, false otherwise
 */
export async function isAdmin(userId: string): Promise<boolean> {
  return hasRole(userId, "admin");
}
