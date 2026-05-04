import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import {
  verifyAdminCredentials,
  createAdminSessionToken,
  getSessionCookieOptions,
} from "@/lib/auth/admin";
import { jsonWithCors, corsOptionsResponse } from "@/lib/api/cors";
import { logger } from "@/lib/api/logger";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return jsonWithCors(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    // Vérifier les credentials
    const isValid = verifyAdminCredentials(username, password);

    if (!isValid) {
      return jsonWithCors({ error: "Invalid credentials" }, { status: 401 });
    }

    // Créer un token de session
    const sessionToken = createAdminSessionToken();

    // Définir le cookie de session
    const cookieStore = await cookies();
    const cookieOptions = getSessionCookieOptions();

    cookieStore.set(cookieOptions.name, sessionToken, {
      httpOnly: cookieOptions.httpOnly,
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
      maxAge: cookieOptions.maxAge,
      path: cookieOptions.path,
    });

    return jsonWithCors(
      { success: true, message: "Login successful" },
      { status: 200 }
    );
  } catch (error) {
    logger.error("Error in admin login API", error);
    return jsonWithCors({ error: "Internal server error" }, { status: 500 });
  }
}

export function OPTIONS() {
  return corsOptionsResponse();
}
