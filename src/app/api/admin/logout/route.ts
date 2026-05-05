import { createServerSupabaseClient } from "@/lib/supabase/auth-server";
import { jsonWithCors, corsOptionsResponse } from "@/lib/api/cors";
import { logger } from "@/lib/api/logger";

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();

    return jsonWithCors(
      { success: true, message: "Logout successful" },
      { status: 200 }
    );
  } catch (error) {
    logger.error("Error in admin logout API", error);
    return jsonWithCors({ error: "Internal server error" }, { status: 500 });
  }
}

export function OPTIONS() {
  return corsOptionsResponse();
}
