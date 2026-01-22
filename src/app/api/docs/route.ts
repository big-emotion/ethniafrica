import { NextResponse } from "next/server";
import { jsonWithCors, corsOptionsResponse } from "@/lib/api/cors";

/**
 * @swagger
 * /api/docs:
 *   get:
 *     summary: Documentation OpenAPI/Swagger (déprécié)
 *     description: Cette route est dépréciée. Utilisez /api/docs/v1 ou /api/docs/v2
 *     tags: [Documentation]
 *     responses:
 *       301:
 *         description: Redirection vers la documentation v1
 */
export async function GET() {
  // Rediriger vers v1 par défaut pour rétrocompatibilité
  return jsonWithCors(
    {
      message:
        "Cette route est dépréciée. Utilisez /api/docs/v1 pour l'API v1 ou /api/docs/v2 pour l'API v2 (AFRIK).",
      links: {
        v1: "/api/docs/v1",
        v2: "/api/docs/v2",
      },
    },
    { status: 301 }
  );
}

export function OPTIONS() {
  return corsOptionsResponse();
}
