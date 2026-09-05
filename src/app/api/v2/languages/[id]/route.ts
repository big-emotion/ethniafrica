/**
 * API v2 - Single Language endpoint
 * GET /api/v2/languages/[id]
 *
 * @swagger
 * /api/v2/languages/{id}:
 *   get:
 *     summary: Get a language by ISO 639-3 identifier
 *     description: Returns the public details for one language.
 *     tags: [API v2 - Languages]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[a-z]{3}$'
 *         description: Lowercase ISO 639-3 language identifier
 *         example: "yor"
 *       - in: query
 *         name: lang
 *         required: false
 *         schema:
 *           type: string
 *           enum: [fr, en]
 *           default: fr
 *         description: >
 *           Locale of the served content. `fr` is the authored language; `en`
 *           overlays the translation record when one exists and declares its
 *           provenance in `meta.translation` (REQ-142).
 *         example: en
 *     responses:
 *       200:
 *         description: Language detail envelope
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LanguageDetailEnvelope'
 *         headers:
 *           Cache-Control:
 *             description: Shared cache duration
 *             schema:
 *               type: string
 *               example: "s-maxage=3600"
 *       400:
 *         description: Invalid language identifier format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorEnvelope'
 *       404:
 *         description: Language not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorEnvelope'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorEnvelope'
 */

import { NextRequest } from "next/server";
import { getLanguageHandler } from "@/api/v2/handlers/languages";
import { languageIdParamSchema } from "@/api/v2/schemas/languages";
import { createApiError } from "@/api/v2/utils/response";
import { validateLang } from "@/api/v2/utils/validation";
import { corsOptionsResponse, jsonWithCors } from "@/lib/api/cors";
import { logger } from "@/lib/api/logger";

const CACHE_CONTROL = "s-maxage=3600";

// @req REQ-136
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const { id } = await params;

  try {
    logger.info("GET /api/v2/languages/[id]", { id });

    if (!languageIdParamSchema.safeParse({ id }).success) {
      logger.warn("Invalid language ID format", { id });
      return jsonWithCors(
        createApiError({
          code: "VALIDATION_ERROR",
          message: "Invalid language ID format",
          field: "id",
        }),
        { status: 400 }
      );
    }

    const lang = validateLang(request.nextUrl.searchParams.get("lang"));
    if (lang === null) {
      logger.warn("Unsupported lang requested", {
        id,
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

    const result = await getLanguageHandler(id, lang);

    if (result.ok === false) {
      logger.warn("Language request rejected", { id, code: result.code });
      return jsonWithCors(
        createApiError({ code: result.code, message: result.message }),
        { status: 404 }
      );
    }

    const response = jsonWithCors(result.envelope, {
      headers: { "Cache-Control": CACHE_CONTROL },
    });

    logger.info("GET /api/v2/languages/[id] completed", {
      id,
      duration: Date.now() - startTime,
      status: 200,
    });

    return response;
  } catch (error) {
    logger.error(`Error in GET /api/v2/languages/${id}`, error, {
      id,
      duration: Date.now() - startTime,
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

// @req REQ-136
export function OPTIONS() {
  return corsOptionsResponse();
}
