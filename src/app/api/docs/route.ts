import { swaggerSpec } from "@/lib/api/openapi";
import { jsonWithCors, corsOptionsResponse } from "@/lib/api/cors";

/**
 * @swagger
 * /api/docs:
 *   get:
 *     summary: Documentation OpenAPI/Swagger
 *     description: Retourne la spécification OpenAPI au format JSON
 *     tags: [Documentation]
 *     responses:
 *       200:
 *         description: Spécification OpenAPI
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
export async function GET() {
  return jsonWithCors(swaggerSpec);
}

export function OPTIONS() {
  return corsOptionsResponse();
}
