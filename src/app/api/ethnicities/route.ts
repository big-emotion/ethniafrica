import { getAllEthnicities } from "@/lib/api/datasetLoader.server";
import { getAllEthnicitiesIncludingSubgroups } from "@/lib/supabase/queries/ethnicities";
import { jsonWithCors, corsOptionsResponse } from "@/lib/api/cors";

/**
 * @swagger
 * /api/ethnicities:
 *   get:
 *     summary: Liste toutes les ethnies
 *     description: Retourne la liste de toutes les ethnies d'Afrique avec leurs statistiques
 *     tags: [Ethnicities]
 *     responses:
 *       200:
 *         description: Liste des ethnies
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ethnicities:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                         example: "Arabes"
 *                       totalPopulation:
 *                         type: number
 *                       percentageInAfrica:
 *                         type: number
 *                       countryCount:
 *                         type: number
 *       500:
 *         description: Erreur serveur
 */
export async function GET() {
  try {
    // Utiliser getAllEthnicitiesIncludingSubgroups pour inclure les sous-groupes
    const allEthnicities = await getAllEthnicitiesIncludingSubgroups();
    const ethnicities = allEthnicities.map((eth) => ({
      name: eth.name_fr,
      key: eth.slug,
      totalPopulation: eth.total_population || 0,
      percentageInAfrica: eth.percentage_in_africa || 0,
      countryCount: 0, // Will be calculated if needed
    }));
    const response = jsonWithCors({ ethnicities });
    // Add Cache-Control headers
    if (response instanceof Response) {
      response.headers.set(
        "Cache-Control",
        "public, max-age=86400, s-maxage=86400"
      );
    }
    return response;
  } catch (error) {
    console.error("Error fetching ethnicities:", error);
    return jsonWithCors(
      { error: "Failed to fetch ethnicities" },
      { status: 500 }
    );
  }
}

export function OPTIONS() {
  return corsOptionsResponse();
}
