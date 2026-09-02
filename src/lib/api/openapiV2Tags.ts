/**
 * The resource families the v2 API exposes, and the one place they are named.
 *
 * This list is the `tags` block of the OpenAPI document — it lives in its own
 * module because two consumers need it and only one of them can afford the
 * spec. `openapiV2.ts` builds the served document through `swagger-jsdoc`, a
 * Node library; the API landing page is a client component, and importing the
 * spec there would put swagger-jsdoc in the browser bundle. Reading the tags
 * from here costs the page a plain array.
 *
 * The landing page enumerated four of these by hand until 2026-09, and was
 * wrong about the API for as long as the API kept growing.
 */

// @req REQ-099
export const OPENAPI_V2_TAGS: { name: string; description: string }[] = [
  {
    name: "API v2 - Search",
    description: "Recherche multi-entités (API v2)",
  },
  {
    name: "API v2 - Countries",
    description: "Opérations sur les pays (API v2)",
  },
  {
    name: "API v2 - Peoples",
    description: "Opérations sur les peuples (API v2)",
  },
  {
    name: "API v2 - Language Families",
    description: "Opérations sur les familles linguistiques (API v2)",
  },
  {
    name: "API v2 - Languages",
    description: "Opérations sur les langues (API v2)",
  },
  {
    name: "API v2 - Keys",
    description: "API key management (issuance)",
  },
  {
    name: "API v2 - Module #0",
    description:
      "Source Transparency Fabric — sources, confidence scores, editorial doctrine",
  },
  {
    name: "API v2 - Oral Narratives",
    description:
      "Public, attributed oral narratives. Restricted narratives and protected metadata are never returned.",
  },
  {
    name: "API v2 - Media",
    description:
      "Media credits (author, licence URI, source page) attached to a fiche. Metadata only — never binary media content (REQ-128).",
  },
  {
    name: "API v2 - Feed",
    description:
      "Revision feed — cursor-paginated Atom + JSON feed of recent published revisions (FR38, AR19, NFR32)",
  },
  {
    name: "API v2 - Flags",
    description:
      "Editorial reports on AFRIK entities. Submission is open — a bearer token is optional and decides attribution only. The control is a proof of work computed in the reader's browser and verified here, so no visitor data reaches a third party (moderation charter §2).",
  },
  {
    name: "API v2 - Reference Library",
    description:
      "Authenticated contributor workspace for structured references, assertion locators, and private working assets.",
  },
  {
    name: "API v2 - Names",
    description:
      "Name-variant records (endonyms, exonyms, historical spellings, surnames) — browsable, filterable, searchable index (FR53, FR55, FR58).",
  },
  {
    name: "API v2 - Patronymes",
    description:
      "Family names (patronymes) — a name's naming system, caste or social function, associated peoples and countries, and bearers. Distinct from API v2 - Names (the ethnonym dossier); bearer entries are a narrow allow-listed summary and never carry ethnic-origin data for a named living person (DEC-040, REQ-133).",
  },
  {
    name: "API v2 - Compare",
    description:
      "Comparison of 2–3 entities of the same type (peoples, countries, or language families), reusing the same assembly path as the SSR comparison page (FR64, AR8, AR9, NFR38).",
  },
  {
    name: "API v2 - Relations",
    description:
      "Sourced inter-people relations plus read-time-computed derived linguistic links (Epic 11, FR73).",
  },
  {
    name: "API v2 - Migrations",
    description:
      "Spatio-temporal migration events (Bantu expansion phases, trade routes, forced displacements, pastoral movements) with GeoJSON geometry, time range, peoples, sources, and confidence (Epic 12, FR83, AR8/AR9).",
  },
  {
    name: "API v2 - Quiz",
    description:
      "Smart quiz engine — audience segments with per-rung question counts, and randomly-composed sessions drawn from the verified AFRIK corpus, gate-checked at serve time (Epic 10, FR65/FR66, AR8/AR9, NFR38).",
  },
];

/**
 * What a tag is called on a French page.
 *
 * Every tag is prefixed `API v2 - ` so Swagger UI groups them under a visible
 * version; a page that already says which version it documents would only be
 * repeating itself sixteen times over.
 */
// @req REQ-099
export const apiTagLabel = (tagName: string) =>
  tagName.replace(/^API v2 - /, "");
