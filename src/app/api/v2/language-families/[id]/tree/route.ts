/**
 * API v2 - Language family classification tree (Epic 7, FR48, FR33)
 * GET /api/v2/language-families/[id]/tree
 *
 * @swagger
 * /api/v2/language-families/{id}/tree:
 *   get:
 *     summary: Classification tree skeleton for a linguistic family
 *     description: >
 *       Returns the family's languages (branches) with their linked people
 *       count, plus the count of peoples in the family not linked to any of
 *       its languages. Assembled from batched AFRIK queries (AR17, no N+1).
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
 *     responses:
 *       200:
 *         description: Family tree skeleton envelope
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LanguageFamilyTreeResponse'
 *         headers:
 *           Cache-Control:
 *             description: "s-maxage=86400"
 *             schema:
 *               type: string
 *       400:
 *         description: Invalid language family id format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorEnvelope'
 *       404:
 *         description: Language family not found
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

import { getLanguageFamilyTreeHandler } from "@/api/v2/handlers/languageFamilyTree";
import { languageFamilyTreeParamSchema } from "@/api/v2/schemas/languageFamilyTree";
import { corpusDetailRoute } from "@/api/v2/utils/corpusRoute";
import { corsOptionsResponse } from "@/lib/api/cors";

export const GET = corpusDetailRoute({
  path: "/api/v2/language-families/[id]/tree",
  param: "id",
  isValidId: (id) => languageFamilyTreeParamSchema.safeParse({ id }).success,
  invalidIdMessage: "Invalid language family ID format",
  servesLang: false,
  // The skeleton is a day-cached derived view, deliberately longer than the
  // records it counts; not part of the corpus cache class.
  cacheControl: "s-maxage=86400",
  rejectedLog: "Language family tree request rejected",
  resolve: (id) => getLanguageFamilyTreeHandler(id),
});

export function OPTIONS() {
  return corsOptionsResponse();
}
