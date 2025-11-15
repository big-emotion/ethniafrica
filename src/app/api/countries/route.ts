import { getAllCountries } from "@/lib/api/datasetLoader.server";
import { jsonWithCors, corsOptionsResponse } from "@/lib/api/cors";
import { getDataVersion, DATA_VERSION_KEYS } from "@/lib/cache/dataVersion";

/**
 * @swagger
 * /api/countries:
 *   get:
 *     summary: Liste tous les pays
 *     description: Retourne la liste de tous les pays d'Afrique avec leurs données
 *     tags: [Countries]
 *     responses:
 *       200:
 *         description: Liste des pays
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
 *                       region:
 *                         type: string
 *                         example: "afrique_du_nord"
 *                       regionName:
 *                         type: string
 *                         example: "Afrique du Nord"
 *                       data:
 *                         type: object
 *                         properties:
 *                           population:
 *                             type: number
 *                           percentageInRegion:
 *                             type: number
 *                           percentageInAfrica:
 *                             type: number
 *                           ethnicityCount:
 *                             type: number
 *       500:
 *         description: Erreur serveur
 */
export async function GET() {
  try {
    const countries = await getAllCountries();
    const dataVersion = getDataVersion(DATA_VERSION_KEYS.COUNTRIES);
    const response = jsonWithCors({
      countries,
      dataVersion, // Inclure la version pour invalidation automatique du cache client
    });
    // Add Cache-Control headers
    if (response instanceof Response) {
      response.headers.set(
        "Cache-Control",
        "public, max-age=86400, s-maxage=86400"
      );
    }
    return response;
  } catch (error) {
    console.error("Error fetching countries:", error);
    return jsonWithCors(
      { error: "Failed to fetch countries" },
      { status: 500 }
    );
  }
}

export function OPTIONS() {
  return corsOptionsResponse();
}
