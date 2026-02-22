/**
 * API v2 - Single Country endpoint
 * GET /api/v2/countries/[iso]
 *
 * @swagger
 * /api/v2/countries/{iso}:
 *   get:
 *     summary: Détails d'un pays
 *     description: Retourne les détails complets d'un pays par son code ISO 3166-1 alpha-3
 *     tags: [API v2 - Countries]
 *     parameters:
 *       - in: path
 *         name: iso
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[A-Z]{3}$'
 *         description: Code ISO 3166-1 alpha-3 du pays
 *         example: "ZWE"
 *     responses:
 *       200:
 *         description: Détails du pays
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/CountryV2'
 *             example:
 *               data:
 *                 id: "ZWE"
 *                 nameFr: "Zimbabwe"
 *                 nameOfficial: "Republic of Zimbabwe"
 *                 etymology: "Nom dérivé de..."
 *                 content: {}
 *       400:
 *         description: Format de code ISO invalide
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Invalid country ISO code format"
 *       404:
 *         description: Pays non trouvé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Country not found"
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

import { NextRequest } from "next/server";
import { getCountryHandler } from "@/api/v2/handlers/countries";
import { validateCountryId } from "@/api/v2/utils/validation";
import { jsonWithCors, corsOptionsResponse } from "@/lib/api/cors";
import { logger } from "@/lib/api/logger";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ iso: string }> }
) {
  const startTime = Date.now();
  try {
    const { iso } = await params;

    logger.info("GET /api/v2/countries/[iso]", { iso });

    // Validate ISO code format
    if (!validateCountryId(iso)) {
      logger.warn("Invalid country ISO code format", { iso });
      return jsonWithCors(
        { error: "Invalid country ISO code format" },
        { status: 400 }
      );
    }

    const country = await getCountryHandler(iso);

    if (!country) {
      logger.warn("Country not found", { iso });
      return jsonWithCors({ error: "Country not found" }, { status: 404 });
    }

    const response = jsonWithCors({ data: country });

    const duration = Date.now() - startTime;
    logger.info("GET /api/v2/countries/[iso] completed", {
      iso,
      duration,
      status: 200,
    });

    return response;
  } catch (error) {
    const { iso } = await params;
    const duration = Date.now() - startTime;
    logger.error(`Error in GET /api/v2/countries/${iso}`, error, {
      iso,
      duration,
    });
    return jsonWithCors({ error: "Internal server error" }, { status: 500 });
  }
}

export function OPTIONS() {
  return corsOptionsResponse();
}
