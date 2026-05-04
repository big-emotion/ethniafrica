import { NextRequest } from "next/server";
import { getPendingContributions } from "@/lib/supabase/admin-queries";
import { jsonWithCors, corsOptionsResponse } from "@/lib/api/cors";
import { getCurrentUser, isAdmin } from "@/lib/auth/supabase-auth";

/**
 * Route API pour lister les contributions en attente (admin)
 */
export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification Supabase
    const user = await getCurrentUser();
    if (!user) {
      return jsonWithCors({ error: "Unauthorized" }, { status: 401 });
    }

    // Vérifier le rôle admin
    const adminCheck = await isAdmin(user.id);
    if (!adminCheck) {
      return jsonWithCors({ error: "Forbidden" }, { status: 403 });
    }

    const contributions = await getPendingContributions();
    return jsonWithCors(contributions);
  } catch (error) {
    console.error("Error fetching contributions:", error);
    return jsonWithCors(
      { error: "Failed to fetch contributions" },
      { status: 500 }
    );
  }
}

export function OPTIONS() {
  return corsOptionsResponse();
}
