import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getSessionCookieOptions } from "@/lib/auth/admin";
import { jsonWithCors, corsOptionsResponse } from "@/lib/api/cors";
import { logger } from "@/lib/api/logger";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const cookieOptions = getSessionCookieOptions();

    // Supprimer le cookie de session
    cookieStore.delete(cookieOptions.name);

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
