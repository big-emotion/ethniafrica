/**
 * Browser-side Supabase client with auth session persistence
 * Uses @supabase/ssr for cookie-based session management
 */
import { createBrowserClient } from "@supabase/ssr";

type BrowserSupabaseClient = ReturnType<typeof createBrowserClient>;

let browserClient: BrowserSupabaseClient | null = null;

/**
 * Create a browser-side Supabase client with cookie storage for auth sessions
 * Uses singleton pattern to reuse the same client instance
 */
export function createBrowserSupabaseClient(): BrowserSupabaseClient {
  if (browserClient) {
    return browserClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file."
    );
  }

  browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey);

  return browserClient;
}
