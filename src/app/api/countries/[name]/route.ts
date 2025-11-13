import {
  getCountryDetails,
  getCountryRegion,
} from "@/lib/api/datasetLoader.server";
import { jsonWithCors, corsOptionsResponse } from "@/lib/api/cors";

/**
 * @swagger
 * /api/countries/{name}:
 *   get:
 *     summary: Obtenir les détails d'un pays
 *     description: Retourne les détails complets d'un pays, y compris ses ethnies
 *     tags: [Countries]
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Nom du pays (ex: "Maroc", "Côte d'Ivoire")
 *     responses:
 *       200:
 *         description: Détails du pays
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                 population:
 *                   type: number
 *                 percentageInRegion:
 *                   type: number
 *                 percentageInAfrica:
 *                   type: number
 *                 region:
 *                   type: string
 *                 ethnicities:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       population:
 *                         type: number
 *                       percentageInCountry:
 *                         type: number
 *                       percentageInRegion:
 *                         type: number
 *                       percentageInAfrica:
 *                         type: number
 *       404:
 *         description: Pays non trouvé
 *       500:
 *         description: Erreur serveur
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const decodedName = decodeURIComponent(name);

    // Trouver la région du pays
    const regionKey = await getCountryRegion(decodedName);
    if (!regionKey) {
      return jsonWithCors({ error: "Country not found" }, { status: 404 });
    }

    // Obtenir les détails complets
    const countryDetails = await getCountryDetails(regionKey, decodedName);
    if (!countryDetails) {
      return jsonWithCors({ error: "Country not found" }, { status: 404 });
    }

    return jsonWithCors(countryDetails);
  } catch (error) {
    console.error("Error fetching country:", error);
    return jsonWithCors({ error: "Failed to fetch country" }, { status: 500 });
  }
}

export function OPTIONS() {
  return corsOptionsResponse();
}
