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

import { getCountryHandler } from "@/api/v2/handlers/countries";
import { corpusDetailRoute, orNotFound } from "@/api/v2/utils/corpusRoute";
import { validateCountryId } from "@/api/v2/utils/validation";
import { corsOptionsResponse } from "@/lib/api/cors";

// @req REQ-084
export const GET = corpusDetailRoute({
  path: "/api/v2/countries/[iso]",
  param: "iso",
  isValidId: validateCountryId,
  invalidIdMessage: "Invalid country ISO code format",
  servesLang: true,
  rejectedLog: "Country not found",
  resolve: async (iso, lang) =>
    orNotFound(await getCountryHandler(iso, lang), "Country not found"),
});

// @req REQ-084
export function OPTIONS() {
  return corsOptionsResponse();
}
