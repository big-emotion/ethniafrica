import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { jsonWithCors, corsOptionsResponse } from "@/lib/api/cors";
import {
  incrementDataVersion,
  DATA_VERSION_KEYS,
} from "@/lib/cache/dataVersion";

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

    // Invalider chaque tag et incrémenter les versions correspondantes
    const invalidatedTags: string[] = [];
    const versionMap: Record<string, string> = {
      "afrik-language-families": DATA_VERSION_KEYS.AFRIK_LANGUAGE_FAMILIES,
      "afrik-peoples": DATA_VERSION_KEYS.AFRIK_PEOPLES,
      "afrik-countries": DATA_VERSION_KEYS.AFRIK_COUNTRIES,
    };

    for (const tag of tags) {
      try {
        revalidateTag(tag, "max");
        invalidatedTags.push(tag);

        // Incrémenter la version correspondante pour invalider le cache client
        const versionKey = versionMap[tag.toLowerCase()];
        if (versionKey) {
          incrementDataVersion(versionKey);
        }
      } catch (error) {
        console.error(`Error revalidating tag "${tag}":`, error);
      }
    }

    return jsonWithCors({
      success: true,
      message: "Cache invalidated successfully",
      invalidatedTags,
    });
  } catch (error) {
    console.error("Error in revalidate endpoint:", error);
    return jsonWithCors(
      { error: "Failed to revalidate cache" },
      { status: 500 }
    );
  }
}

export function OPTIONS() {
  return corsOptionsResponse();
}
