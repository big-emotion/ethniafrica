// This module holds SUPABASE_SERVICE_ROLE_KEY, which bypasses every RLS policy.
// `server-only` is what actually keeps it out of a client bundle: importing this
// file from a client component fails the build. The comment that used to stand
// here in its place stopped nothing.
import "server-only";

/**
 * Client Supabase admin (pour modération)
 * Utilise la service role key pour bypasser RLS
 */
import { createClient } from "@supabase/supabase-js";

import { fetchWithDeadline } from "./requestDeadline";

// @req REQ-054
export const createAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      "Missing Supabase admin environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env.local file."
    );
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: fetchWithDeadline,
    },
  });
};
