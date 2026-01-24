import { swaggerSpecV2 } from "@/lib/api/openapiV2";
import { jsonWithCors, corsOptionsResponse } from "@/lib/api/cors";

/**
 * @swagger
 * /api/docs/v2:
 *   get:
 *     summary: Documentation OpenAPI/Swagger v2
 *     description: Retourne la spécification OpenAPI v2 (AFRIK) au format JSON
 *     tags: [Documentation]
 *     responses:
 *       200:
 *         description: Spécification OpenAPI v2
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
export async function GET() {
  return jsonWithCors(swaggerSpecV2);
}

export function OPTIONS() {
  return corsOptionsResponse();
}
