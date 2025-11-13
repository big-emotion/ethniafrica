import { getRegions } from "@/lib/api/datasetLoader.server";
import { jsonWithCors, corsOptionsResponse } from "@/lib/api/cors";

/**
 * @swagger
 * /api/regions:
 *   get:
 *     summary: Liste toutes les régions
 *     description: Retourne la liste de toutes les régions d'Afrique avec leurs données
 *     tags: [Regions]
 *     responses:
 *       200:
 *         description: Liste des régions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 regions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       key:
 *                         type: string
 *                         example: "afrique_du_nord"
 *                       data:
 *                         $ref: '#/components/schemas/RegionData'
 *       500:
 *         description: Erreur serveur
 */
export async function GET() {
  try {
    const regions = await getRegions();
    return jsonWithCors({ regions });
  } catch (error) {
    console.error("Error fetching regions:", error);
    return jsonWithCors({ error: "Failed to fetch regions" }, { status: 500 });
  }
}

export function OPTIONS() {
  return corsOptionsResponse();
}
