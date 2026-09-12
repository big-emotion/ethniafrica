/**
 * API v2 - Single Patronyme endpoint
 * GET /api/v2/patronymes/[id]
 *
 * @swagger
 * /api/v2/patronymes/{id}:
 *   get:
 *     summary: Get a name (patronyme) by identifier
 *     description: >
 *       Returns the public details for one name (patronyme) — DEC-038's fifth
 *       corpus dimension: its naming system, its associated peoples and
 *       countries, and its bearers. Distinct from `/api/v2/names`, which
 *       serves the ethnonym dossier (name_records).
 *     tags: [API v2 - Patronymes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^PAT_[A-Z0-9_]+$'
 *         description: Patronyme identifier
 *         example: "PAT_KEITA"
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
 *         description: Patronyme detail envelope
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PatronymeDetailEnvelope'
 *         headers:
 *           Cache-Control:
 *             description: Shared cache duration
 *             schema:
 *               type: string
 *               example: "s-maxage=3600"
 *       400:
 *         description: Invalid patronyme identifier format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorEnvelope'
 *       404:
 *         description: Patronyme not found
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

import { getPatronymeHandler } from "@/api/v2/handlers/patronymes";
import { patronymeIdParamSchema } from "@/api/v2/schemas/patronymes";
import {
  CORPUS_CACHE_CONTROL,
  corpusDetailRoute,
} from "@/api/v2/utils/corpusRoute";
import { corsOptionsResponse } from "@/lib/api/cors";

// @req REQ-133
export const GET = corpusDetailRoute({
  path: "/api/v2/patronymes/[id]",
  param: "id",
  isValidId: (id) => patronymeIdParamSchema.safeParse({ id }).success,
  invalidIdMessage: "Invalid patronyme ID format",
  servesLang: true,
  cacheControl: CORPUS_CACHE_CONTROL,
  rejectedLog: "Patronyme request rejected",
  resolve: (id, lang) => getPatronymeHandler(id, lang),
});

// @req REQ-133
export function OPTIONS() {
  return corsOptionsResponse();
}
