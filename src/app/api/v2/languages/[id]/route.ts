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

import { getLanguageHandler } from "@/api/v2/handlers/languages";
import { languageIdParamSchema } from "@/api/v2/schemas/languages";
import {
  CORPUS_CACHE_CONTROL,
  corpusDetailRoute,
} from "@/api/v2/utils/corpusRoute";
import { corsOptionsResponse } from "@/lib/api/cors";

// @req REQ-136
export const GET = corpusDetailRoute({
  path: "/api/v2/languages/[id]",
  param: "id",
  isValidId: (id) => languageIdParamSchema.safeParse({ id }).success,
  invalidIdMessage: "Invalid language ID format",
  servesLang: true,
  cacheControl: CORPUS_CACHE_CONTROL,
  rejectedLog: "Language request rejected",
  resolve: (id, lang) => getLanguageHandler(id, lang),
});

// @req REQ-136
export function OPTIONS() {
  return corsOptionsResponse();
}
