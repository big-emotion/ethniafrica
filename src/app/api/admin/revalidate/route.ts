import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { jsonWithCors, corsOptionsResponse } from "@/lib/api/cors";
import { logger } from "@/lib/api/logger";

/**
 * POST /api/admin/revalidate
 * Invalide le cache Next.js pour les données mises à jour
 *
 * Body: { tags: string[] } - Liste des tags à invalider
 *
 * Tags disponibles:
 * - "afrik-language-families" - Invalide le cache des familles linguistiques AFRIK
 * - "afrik-peoples" - Invalide le cache des peuples AFRIK
 * - "afrik-countries" - Invalide le cache des pays AFRIK
 */
// @req REQ-091
export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification avec un secret
    const authHeader = request.headers.get("authorization");
    const expectedToken = process.env.REVALIDATE_SECRET;

    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return jsonWithCors({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { tags } = body;

    if (!tags || !Array.isArray(tags)) {
      return jsonWithCors(
        { error: "Invalid request. 'tags' must be an array" },
        { status: 400 }
      );
    }

    const invalidatedTags: string[] = [];

    for (const tag of tags) {
      try {
        revalidateTag(tag, "max");
        invalidatedTags.push(tag);
      } catch (error) {
        logger.error(`Error revalidating tag "${tag}"`, error);
      }
    }

    return jsonWithCors({
      success: true,
      message: "Cache invalidated successfully",
      invalidatedTags,
    });
  } catch (error) {
    logger.error("Error in revalidate endpoint", error);
    return jsonWithCors(
      { error: "Failed to revalidate cache" },
      { status: 500 }
    );
  }
}

// @req REQ-091
export function OPTIONS() {
  return corsOptionsResponse();
}
