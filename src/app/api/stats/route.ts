import { getTotalPopulationAfrica } from "@/lib/api/datasetLoader.server";
import { jsonWithCors, corsOptionsResponse } from "@/lib/api/cors";

/**
 * @swagger
 * /api/stats:
 *   get:
 *     summary: Obtenir les statistiques globales
 *     description: Retourne la population totale de l'Afrique
 *     tags: [Statistics]
 *     responses:
 *       200:
 *         description: Statistiques globales
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalPopulationAfrica:
 *                   type: number
 *                   example: 1528273044
 *       500:
 *         description: Erreur serveur
 */
export async function GET() {
  try {
    const totalPopulation = await getTotalPopulationAfrica();
    return jsonWithCors({
      totalPopulationAfrica: totalPopulation,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return jsonWithCors(
      { error: "Failed to fetch statistics" },
      { status: 500 }
    );
  }
}

export function OPTIONS() {
  return corsOptionsResponse();
}
