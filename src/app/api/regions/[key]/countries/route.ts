import { getCountriesInRegion } from "@/lib/api/datasetLoader.server";
import { jsonWithCors, corsOptionsResponse } from "@/lib/api/cors";

/**
 * @swagger
 * /api/regions/{key}/countries:
 *   get:
 *     summary: Obtenir les pays d'une région
 *     description: Retourne la liste des pays d'une région spécifique
 *     tags: [Regions]
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: Clé de la région
 *     responses:
 *       200:
 *         description: Liste des pays de la région
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 countries:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                         example: "Maroc"
 *                       data:
 *                         type: object
 *                         properties:
 *                           population:
 *                             type: number
 *                           percentageInRegion:
 *                             type: number
 *                           percentageInAfrica:
 *                             type: number
 *       404:
 *         description: Région non trouvée
 *       500:
 *         description: Erreur serveur
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
    const decodedKey = decodeURIComponent(key);
    const countries = await getCountriesInRegion(decodedKey);

    if (countries.length === 0) {
      // Vérifier si la région existe
      const { getRegion } = await import("@/lib/api/datasetLoader.server");
      const region = await getRegion(decodedKey);
      if (!region) {
        return jsonWithCors({ error: "Region not found" }, { status: 404 });
      }
    }

    return jsonWithCors({ countries });
  } catch (error) {
    console.error("Error fetching countries in region:", error);
    return jsonWithCors(
      { error: "Failed to fetch countries" },
      { status: 500 }
    );
  }
}

export function OPTIONS() {
  return corsOptionsResponse();
}
