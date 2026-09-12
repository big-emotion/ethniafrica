/**
 * API v2 — single dossier
 * GET /api/v2/dossiers/[id]
 *
 * @swagger
 * /api/v2/dossiers/{id}:
 *   get:
 *     summary: Get one dossier by identifier
 *     description: >
 *       Returns the whole dossier — thesis, chapters, the two readings each
 *       chapter carries, its illustration credits, its sources and the gaps it
 *       declares. Every chapter published here holds both an authoritative and
 *       a counter reading; the schema refuses to serve one that does not.
 *     tags: [API v2 - Dossiers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^DOS_[A-Z0-9_]+$'
 *         description: Dossier identifier
 *         example: "DOS_PROPORTIONS"
 *     responses:
 *       200:
 *         description: Dossier detail envelope
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DossierDetailEnvelope'
 *         headers:
 *           Cache-Control:
 *             description: Shared cache duration
 *             schema:
 *               type: string
 *               example: "s-maxage=3600"
 *       400:
 *         description: Invalid dossier identifier format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorEnvelope'
 *       404:
 *         description: Dossier not found
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

import { getDossierHandler } from "@/api/v2/handlers/dossiers";
import { dossierIdParamSchema } from "@/api/v2/schemas/dossiers";
import {
  CORPUS_CACHE_CONTROL,
  corpusDetailRoute,
} from "@/api/v2/utils/corpusRoute";
import { corsOptionsResponse } from "@/lib/api/cors";

// @req REQ-114
export const GET = corpusDetailRoute({
  path: "/api/v2/dossiers/[id]",
  param: "id",
  isValidId: (id) => dossierIdParamSchema.safeParse(id).success,
  invalidIdMessage: "Invalid dossier ID format",
  servesLang: false,
  cacheControl: CORPUS_CACHE_CONTROL,
  rejectedLog: "Dossier request rejected",
  resolve: (id) => getDossierHandler(id),
});

// @req REQ-114
export function OPTIONS() {
  return corsOptionsResponse();
}
