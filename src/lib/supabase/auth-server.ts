/**
 * Server-side Supabase client for Server Components and API routes
 * Uses @supabase/ssr with Next.js 15 async cookies() API
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

type ServerSupabaseClient = ReturnType<typeof createServerClient>;

/**
 * Create a server-side Supabase client with cookie-based auth
 * Must be called within a Server Component or API route context
 */
export async function createServerSupabaseClient(): Promise<ServerSupabaseClient> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file."
    );
  }

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing sessions.
        }
      },
    },
  });
}
