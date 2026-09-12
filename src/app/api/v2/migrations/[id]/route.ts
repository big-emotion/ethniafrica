/**
 * API v2 - Migration detail (Epic 12, Story 12.5, ETNI-518)
 * GET /api/v2/migrations/[id]
 *
 * @swagger
 * /api/v2/migrations/{id}:
 *   get:
 *     summary: Get a single migration event
 *     description: >
 *       Full migration event detail incl. GeoJSON geometry, time range,
 *       peoples involved (one batched join query, AR17), sources,
 *       narrative, debate, and meta.confidence.
 *     tags: ["API v2 - Migrations"]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^MGR_[A-Z0-9_]+$'
 *         description: Identifiant de l'événement migratoire (format MGR_*)
 *         example: "MGR_BANTU_HOMELAND_DISPERSAL"
 *     responses:
 *       200:
 *         description: Migration detail envelope
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MigrationDetailResponse'
 *         headers:
 *           Cache-Control:
 *             description: "s-maxage=3600 (people-data class, AR18)"
 *             schema:
 *               type: string
 *       422:
 *         description: Invalid migration id format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorEnvelope'
 *       404:
 *         description: Migration not found
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

import { getMigrationDetailHandler } from "@/api/v2/handlers/migrations";
import { migrationDetailParamSchema } from "@/api/v2/schemas/migrations";
import {
  CORPUS_CACHE_CONTROL,
  corpusDetailRoute,
} from "@/api/v2/utils/corpusRoute";
import { corsOptionsResponse } from "@/lib/api/cors";

export const GET = corpusDetailRoute({
  path: "/api/v2/migrations/[id]",
  param: "id",
  isValidId: (id) => migrationDetailParamSchema.safeParse({ id }).success,
  invalidIdMessage: "Invalid migration ID format",
  invalidIdStatus: 422,
  servesLang: false,
  cacheControl: CORPUS_CACHE_CONTROL,
  rejectedLog: "Migration detail request rejected",
  resolve: (id) => getMigrationDetailHandler(id),
});

export function OPTIONS() {
  return corsOptionsResponse();
}
