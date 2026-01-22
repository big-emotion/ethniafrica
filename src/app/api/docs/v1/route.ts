import { swaggerSpecV1 } from "@/lib/api/openapiV1";
import { jsonWithCors, corsOptionsResponse } from "@/lib/api/cors";

/**
 * @swagger
 * /api/docs/v1:
 *   get:
 *     summary: Documentation OpenAPI/Swagger v1
 *     description: Retourne la spécification OpenAPI v1 au format JSON
 *     tags: [Documentation]
 *     responses:
 *       200:
 *         description: Spécification OpenAPI v1
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
export async function GET() {
  return jsonWithCors(swaggerSpecV1);
}

export function OPTIONS() {
  return corsOptionsResponse();
}
