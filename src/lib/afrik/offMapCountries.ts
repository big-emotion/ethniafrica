/**
 * Countries outside the atlas's Africa scope that the corpus legitimately
 * cites, as declared diaspora presences. They are not drawn — the admin-0
 * asset is Africa-only — but they are real, and the fiche counts them in its
 * total population.
 *
 * The list is explicit so that adding one is a deliberate act. FR29 only ever
 * checked that a code was three uppercase letters, which is how "GBN" stood in
 * for Gabon on PPL_IGBO for as long as the fiche existed: well-formed,
 * meaningless, and silently undrawable.
 *
 * BRA and HTI (REQ-130, supersedes REQ-001) were the first host countries the
 * Afro-descendant peoples of DEC-030 needed — attached to the corpus by
 * history rather than linguistic filiation. ETNI-1388 completes that corpus
 * extension: BLZ, COL, GLP, GTM, GUF, HND, JAM, NIC and SUR are the remaining
 * host countries for the ten Afro-descendant people fiches (Garinagu,
 * Palenqueros, Raizales, Saamaka, Okanisi, Guadeloupe Creoles, Jamaican
 * Maroons).
 *
 * This set lives here, rather than in `scripts/validateAfrikData.ts` where it
 * began, because the validator was not its only reader: the patronyme loader
 * resolves the same country references against `afrik_countries`, which holds
 * the 54 African countries and nothing else. With the set visible only to the
 * validator, a diaspora attestation passed every gate and then aborted the
 * load — ESP on PAT_BORICO froze all 777 patronyme dossiers that way. One
 * definition, both readers.
 */
export const OFF_MAP_COUNTRIES: ReadonlySet<string> = new Set([
  "AUS",
  "BLZ",
  "BRA",
  "CAN",
  "COL",
  "ESP",
  "FRA",
  "GBR",
  "GLP",
  "GTM",
  "GUF",
  "HND",
  "HTI",
  "JAM",
  "NIC",
  "NLD",
  "OMN",
  "PRT",
  "SUR",
  "USA",
  "YEM",
]);

/**
 * True when a country code is a declared off-map presence rather than one of
 * the 54 African countries the atlas draws and stores.
 */
export function isOffMapCountry(code: string): boolean {
  return OFF_MAP_COUNTRIES.has(code);
}
