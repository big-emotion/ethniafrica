/**
 * Put an address on the moderation allowlist.
 *
 *   npx tsx scripts/seedAdminAllowlist.ts moderation@example.org "Responsable éditorial de la modération"
 *
 * This is the bootstrap problem the allowlist creates and the reason it is
 * solved here rather than in the product: nobody can open the console until an
 * address is on the list, and there is no screen for adding one because adding
 * one needs the console. So the first entry is written by whoever holds the
 * service-role key, which is exactly the right authority for it.
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from the
 * environment — point them at the project you mean. Both Supabase projects
 * label their environment "production"; `shmrjtnfbqzceovroqjj` serves recette.
 */
import { createClient } from "@supabase/supabase-js";

async function main(): Promise<void> {
  const [email, note] = process.argv.slice(2);

  if (!email?.includes("@")) {
    console.error(
      "Usage: npx tsx scripts/seedAdminAllowlist.ts <email> [note]"
    );
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    console.error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set."
    );
    process.exit(1);
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { error } = await supabase
    .from("admin_allowlist")
    .upsert(
      { email: email.trim(), note: note?.trim() ?? null },
      { onConflict: "email" }
    );

  if (error) {
    console.error(`Failed to add ${email} to the allowlist:`, error.message);
    process.exit(1);
  }

  console.log(
    `${email} may now request a sign-in link at /fr/admin/connexion.`
  );
}

main();
