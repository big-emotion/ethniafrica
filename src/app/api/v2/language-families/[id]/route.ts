/**
 * API v2 - Single Language Family endpoint
 * GET /api/v2/language-families/[id]
 *
 * @swagger
 * /api/v2/language-families/{id}:
 *   get:
 *     summary: Détails d'une famille linguistique
 *     description: Retourne les détails complets d'une famille linguistique par son identifiant FLG_*
 *     tags: [API v2 - Language Families]
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
 *         description: Détails de la famille linguistique
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LanguageFamilyDetailEnvelope'
 *       400:
 *         description: Format d'identifiant invalide
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorEnvelope'
 *       404:
 *         description: Famille linguistique non trouvée
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

import { getLanguageFamilyHandler } from "@/api/v2/handlers/languageFamilies";
import { corpusDetailRoute, orNotFound } from "@/api/v2/utils/corpusRoute";
import { validateLanguageFamilyId } from "@/api/v2/utils/validation";
import { corsOptionsResponse } from "@/lib/api/cors";

// @req REQ-084
export const GET = corpusDetailRoute({
  path: "/api/v2/language-families/[id]",
  param: "id",
  isValidId: validateLanguageFamilyId,
  invalidIdMessage: "Invalid language family ID format",
  servesLang: true,
  rejectedLog: "Language family not found",
  resolve: async (id, lang) =>
    orNotFound(
      await getLanguageFamilyHandler(id, lang),
      "Language family not found"
    ),
});

// @req REQ-084
export function OPTIONS() {
  return corsOptionsResponse();
}
