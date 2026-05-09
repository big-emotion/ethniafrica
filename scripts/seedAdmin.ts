/**
 * Admin User Seed Script
 *
 * Seeds the first admin user into the user_roles table.
 * The user must already exist in auth.users (sign up via login page first).
 *
 * Usage:
 *   ADMIN_EMAIL=admin@example.com npx tsx scripts/seedAdmin.ts
 *   npx tsx scripts/seedAdmin.ts admin@example.com
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * User type from Supabase Auth
 */
interface AuthUser {
  id: string;
  email?: string;
}

/**
 * Finds a user by email using Supabase Admin API
 * @returns The user object if found, null otherwise
 */
export async function findUserByEmail(
  supabase: ReturnType<typeof createAdminClient>,
  email: string
): Promise<{ id: string; email: string } | null> {
  const { data, error } = await supabase.auth.admin.listUsers();

  if (error) {
    throw new Error(`Failed to list users: ${error.message}`);
  }

  if (!data || !data.users) {
    return null;
  }

  const users = data.users as AuthUser[];
  const user = users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );

  if (!user || !user.email) {
    return null;
  }

  return { id: user.id, email: user.email };
}

/**
 * Assigns admin role to a user
 * Uses upsert to handle the case where the role already exists
 */
export async function assignAdminRole(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string
): Promise<{ created: boolean }> {
  // Check if role already exists
  const { data: existing } = await supabase
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "admin")
    .single();

  if (existing) {
    return { created: false };
  }

  // Insert new admin role
  const { error } = await supabase.from("user_roles").insert({
    user_id: userId,
    role: "admin",
  });

  if (error) {
    throw new Error(`Failed to assign admin role: ${error.message}`);
  }

  return { created: true };
}

/**
 * Main seed function
 */
export async function seedAdmin(email: string): Promise<void> {
  console.log("🔐 Admin User Seed Script");
  console.log("========================\n");

  // Validate email
  if (!isValidEmail(email)) {
    throw new Error(`Invalid email format: ${email}`);
  }

  console.log(`📧 Admin email: ${email}`);

  const supabase = createAdminClient();

  // Step 1: Find user by email
  console.log("\n🔍 Looking up user...");
  const user = await findUserByEmail(supabase, email);

  if (!user) {
    console.error(`\n❌ User not found: ${email}`);
    console.error("\n📝 Instructions:");
    console.error("   1. The user must sign up first via the login page");
    console.error("   2. They can use magic link or OAuth to create their account");
    console.error("   3. Once registered, run this script again\n");
    throw new Error(`User not found: ${email}`);
  }

  console.log(`   ✅ Found user: ${user.email} (${user.id})`);

  // Step 2: Assign admin role
  console.log("\n🔧 Assigning admin role...");
  const { created } = await assignAdminRole(supabase, user.id);

  if (created) {
    console.log("   ✅ Admin role assigned successfully!\n");
  } else {
    console.log("   ℹ️  User already has admin role\n");
  }

  console.log("✨ Done!");
  console.log(`\n📋 Summary:`);
  console.log(`   Email: ${email}`);
  console.log(`   User ID: ${user.id}`);
  console.log(`   Role: admin`);
  console.log(`   Status: ${created ? "Created" : "Already exists"}\n`);
}

// CLI execution
if (require.main === module) {
  // Get email from CLI argument or environment variable
  const email = process.argv[2] || process.env.ADMIN_EMAIL;

  if (!email) {
    console.error("❌ Error: No admin email provided\n");
    console.error("Usage:");
    console.error("  ADMIN_EMAIL=admin@example.com npx tsx scripts/seedAdmin.ts");
    console.error("  npx tsx scripts/seedAdmin.ts admin@example.com\n");
    process.exit(1);
  }

  seedAdmin(email)
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error(`\n❌ Error: ${error.message}\n`);
      process.exit(1);
    });
}
