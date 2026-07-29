/**
 * API v2 - Language family tree branch (Epic 7, FR48/NFR3)
 * GET /api/v2/language-families/[id]/tree/branch
 *
 * @swagger
 * /api/v2/language-families/{id}/tree/branch:
 *   get:
 *     summary: Paginated branch of a language family's classification tree
 *     description: >
 *       Lazily loads one branch of the family tree (people belonging to a
 *       given language, or the unlinked-peoples group) so large branches
 *       (e.g. Bantu) can be fetched page by page instead of inflating the
 *       initial tree payload (FR48, NFR3).
 *     tags: ["API v2 - Language Families"]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^FLG_[A-Z_]+$'
 *         description: Identifiant de la famille linguistique (format FLG_*)
 *         example: "FLG_BANTU"
 *       - in: query
 *         name: language
 *         required: false
 *         schema:
 *           type: string
 *           pattern: '^[a-z]{3}$'
 *         description: >
 *           Code ISO 639-3 de la langue de la famille dont on veut les
 *           peuples. Mutuellement exclusif avec `group`.
 *         example: "kon"
 *       - in: query
 *         name: group
 *         required: false
 *         schema:
 *           type: string
 *           enum: ["unlinked"]
 *         description: >
 *           Sélectionne le groupe des peuples non rattachés à une langue de
 *           la famille. Mutuellement exclusif avec `language`.
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: offset
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *     responses:
 *       200:
 *         description: Paginated people nodes for the requested branch
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LanguageFamilyTreeBranchResponse'
 *         headers:
 *           Cache-Control:
 *             description: "s-maxage=3600"
 *             schema:
 *               type: string
 *       400:
 *         description: Malformed id, language, limit or offset, or missing/ambiguous selector
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorEnvelope'
 *       422:
 *         description: Language is a valid ISO 639-3 code but not a language of this family
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorEnvelope'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorEnvelope'
 */

import { NextRequest } from "next/server";
import { getFamilyTreeBranchHandler } from "@/api/v2/handlers/languageFamilyTree";
import {
  languageFamilyTreeBranchParamSchema,
  languageFamilyTreeBranchQuerySchema,
} from "@/api/v2/schemas/languageFamilyTree";
import { createApiError } from "@/api/v2/utils/response";
import { jsonWithCors, corsOptionsResponse } from "@/lib/api/cors";
import { logger } from "@/lib/api/logger";

const CACHE_CONTROL = "s-maxage=3600";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const { id } = await params;

  try {
    logger.info("GET /api/v2/language-families/[id]/tree/branch", { id });

    const paramResult = languageFamilyTreeBranchParamSchema.safeParse({ id });
    if (!paramResult.success) {
      logger.warn("Invalid language family id format", { id });
      return jsonWithCors(
        createApiError({
          code: "VALIDATION_ERROR",
          message: "Invalid language family id format",
          field: "id",
        }),
        { status: 400 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const queryResult = languageFamilyTreeBranchQuerySchema.safeParse({
      language: searchParams.get("language") ?? undefined,
      group: searchParams.get("group") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      offset: searchParams.get("offset") ?? undefined,
    });

    if (!queryResult.success) {
      const issue = queryResult.error.issues[0];
      logger.warn("Invalid query params", {
        id,
        issues: queryResult.error.issues,
      });
      return jsonWithCors(
        createApiError({
          code: "VALIDATION_ERROR",
          message: issue?.message ?? "Invalid query params",
          field: issue?.path.join(".") || undefined,
        }),
        { status: 400 }
      );
    }

    const { language, group, limit, offset } = queryResult.data;
    const selector = language ? { language } : { group: group as "unlinked" };

    const result = await getFamilyTreeBranchHandler(id, selector, {
      limit,
      offset,
    });

    if (result.ok === false) {
      logger.warn("Tree branch request rejected", { id, code: result.code });
      return jsonWithCors(
        createApiError({ code: result.code, message: result.message }),
        { status: 422 }
      );
    }

    const response = jsonWithCors(result.envelope, {
      headers: { "Cache-Control": CACHE_CONTROL },
    });

    logger.info("GET /api/v2/language-families/[id]/tree/branch completed", {
      id,
      duration: Date.now() - startTime,
      status: 200,
    });

    return response;
  } catch (error) {
    logger.error(
      `Error in GET /api/v2/language-families/${id}/tree/branch`,
      error,
      { id, duration: Date.now() - startTime }
    );
    return jsonWithCors(
      createApiError({
        code: "INTERNAL_ERROR",
        message: "Internal server error",
      }),
      { status: 500 }
    );
  }
}

export function OPTIONS() {
  return corsOptionsResponse();
}
