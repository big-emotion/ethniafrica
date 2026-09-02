/**
 * Client Supabase pour Server Components et API routes
 * Utilise la clé anonyme pour les requêtes publiques côté serveur
 */
import { createClient } from "@supabase/supabase-js";

import { fetchWithDeadline } from "./requestDeadline";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file."
  );
}

// @req REQ-054
export const createServerClient = () => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
    global: {
      fetch: fetchWithDeadline,
    },
  });
};
