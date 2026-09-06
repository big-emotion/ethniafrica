/**
 * API v2 - Single Country endpoint
 * GET /api/v2/countries/[iso]
 *
 * @swagger
 * /api/v2/countries/{iso}:
 *   get:
 *     summary: Détails d'un pays
 *     description: >
 *       Retourne les détails complets d'un pays par son code ISO 3166-1
 *       alpha-3, et le bloc `patronymes` — les noms attestés dans ce pays et,
 *       séparément, ceux que portent ses peuples sans y être attestés. Les deux
 *       listes affirment des choses différentes et ne sont jamais additionnées.
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
 *       - in: query
 *         name: lang
 *         required: false
 *         schema:
 *           type: string
 *           enum: [fr, en]
 *           default: fr
 *         description: >
 *           Locale du contenu servi. `fr` est la langue d'auteur ; `en`
 *           superpose l'enregistrement de traduction quand il existe et
 *           déclare sa provenance dans `meta.translation` (REQ-142).
 *         example: en
 *     responses:
 *       200:
 *         description: Détails du pays
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CountryDetailEnvelope'
 *       400:
 *         description: Format de code ISO invalide
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorEnvelope'
 *       404:
 *         description: Pays non trouvé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorEnvelope'
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorEnvelope'
 */

import { NextRequest } from "next/server";
import { getCountryHandler } from "@/api/v2/handlers/countries";
import { createApiError } from "@/api/v2/utils/response";
import { validateCountryId, validateLang } from "@/api/v2/utils/validation";
import { jsonWithCors, corsOptionsResponse } from "@/lib/api/cors";
import { logger } from "@/lib/api/logger";

// @req REQ-084
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ iso: string }> }
) {
  const startTime = Date.now();
  const { iso } = await params;

  try {
    logger.info("GET /api/v2/countries/[iso]", { iso });

    // Validate ISO code format
    if (!validateCountryId(iso)) {
      logger.warn("Invalid country ISO code format", { iso });
      return jsonWithCors(
        createApiError({
          code: "VALIDATION_ERROR",
          message: "Invalid country ISO code format",
          field: "iso",
        }),
        { status: 400 }
      );
    }

    const lang = validateLang(request.nextUrl.searchParams.get("lang"));
    if (lang === null) {
      logger.warn("Unsupported lang requested", {
        iso,
        lang: request.nextUrl.searchParams.get("lang"),
      });
      return jsonWithCors(
        createApiError({
          code: "VALIDATION_ERROR",
          message: "Unsupported lang: expected fr or en",
          field: "lang",
        }),
        { status: 400 }
      );
    }

    const envelope = await getCountryHandler(iso, lang);

    if (!envelope) {
      logger.warn("Country not found", { iso });
      return jsonWithCors(
        createApiError({
          code: "NOT_FOUND",
          message: "Country not found",
        }),
        { status: 404 }
      );
    }

    const response = jsonWithCors(envelope);

    const duration = Date.now() - startTime;
    logger.info("GET /api/v2/countries/[iso] completed", {
      iso,
      duration,
      status: 200,
    });

    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`Error in GET /api/v2/countries/${iso}`, error, {
      iso,
      duration,
    });
    return jsonWithCors(
      createApiError({
        code: "INTERNAL_ERROR",
        message: "Internal server error",
      }),
      { status: 500 }
    );
  }
}

// @req REQ-084
export function OPTIONS() {
  return corsOptionsResponse();
}
