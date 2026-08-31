import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.1.0",
    info: {
      title: "Ethniafrique Atlas API v2 - AFRIK",
      version: "2.2.0",
      description:
        "API publique v2 basée sur la méthodologie AFRIK. Identifiants stables (FLG_*, PPL_*, codes ISO 3166-1 alpha-3) et format de réponse standardisé avec pagination. Cette API fournit un accès structuré aux données ethnographiques et linguistiques de l'Afrique.\n\n" +
        "## Response envelope\n\n" +
        "Every `/api/v2/*` response uses the Module #0 envelope: `{ data, meta: { license, attribution, pagination?, confidence?, pinned_url? }, errors }`. License and attribution are always present (AR8); `errors` is empty on success and populated on non-2xx responses. List endpoints place their pagination values under `meta.pagination`.\n\n" +
        "## 2.1.0 — one source-tier vocabulary (breaking)\n\n" +
        'Source authority is now one three-value scale — `official` | `referenced` | `unverified` — spoken identically by the database, the payloads and the UI. Provenance stays on the separate `source_kind` axis, so AI-generated text is `tier: "unverified"` + `source_kind: "ai_generated"` rather than a tier of its own.\n\n' +
        "Removed, all superseded by `tier`:\n\n" +
        "- the numeric evidence-tier property on `Source`, `ReferenceSource` and `ReferenceCreateInput` (a `1 | 2 | null` scale that could not express an unverified source);\n" +
        "- the legacy `Source.type` enum, which read a column dropped in migration 015 and was therefore always `null`;\n" +
        "- the two catalogue gating properties on `Source.policy`, which decided whether a citation could be published at all. Under the source doctrine no citation is refused, so `Source.policy.tier` carries the signal instead.",
      contact: {
        name: "Ethniafrique Atlas",
        url: "https://github.com/big-emotion/ethniafrica",
      },
    },
    servers: [
      {
        url:
          process.env.NEXT_PUBLIC_SITE_URL ||
          (process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : "http://localhost:3000"),
        description: process.env.VERCEL_URL
          ? "Serveur de production"
          : "Serveur de développement",
      },
    ],
    tags: [
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
    ],
    paths: {
      "/api/v2/reference-library": {
        get: {
          summary: "Search structured references",
          description:
            "Searches the authenticated contributor reference library. The result is mutable and is never cached.",
          tags: ["API v2 - Reference Library"],
          security: [{ SupabaseJwtAuth: [] }],
          parameters: [
            {
              in: "query",
              name: "q",
              required: true,
              schema: { type: "string", minLength: 1, maxLength: 200 },
              description: "Reference search term.",
            },
            {
              in: "query",
              name: "limit",
              required: false,
              schema: {
                type: "integer",
                minimum: 1,
                maximum: 100,
                default: 20,
              },
              description: "Maximum number of matching references to return.",
            },
          ],
          responses: {
            200: {
              description: "Matching references.",
              headers: {
                "Cache-Control": {
                  schema: { type: "string", example: "no-store" },
                },
              },
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ReferenceSearchResponse",
                  },
                },
              },
            },
            400: {
              description: "Invalid search query.",
              headers: {
                "Cache-Control": {
                  schema: { type: "string", example: "no-store" },
                },
              },
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ApiErrorEnvelope" },
                },
              },
            },
            401: {
              description: "Missing or invalid Supabase access token.",
              headers: {
                "Cache-Control": {
                  schema: { type: "string", example: "no-store" },
                },
              },
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ApiErrorEnvelope" },
                },
              },
            },
            500: {
              description: "Internal server error.",
              headers: {
                "Cache-Control": {
                  schema: { type: "string", example: "no-store" },
                },
              },
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ApiErrorEnvelope" },
                },
              },
            },
          },
        },
        post: {
          summary: "Create or resolve a structured reference",
          description:
            "Creates a structured reference or returns an existing matching entry. The result is mutable and is never cached.",
          tags: ["API v2 - Reference Library"],
          security: [{ SupabaseJwtAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ReferenceCreateInput",
                },
              },
            },
          },
          responses: {
            200: {
              description: "Existing matching reference returned.",
              headers: {
                "Cache-Control": {
                  schema: { type: "string", example: "no-store" },
                },
              },
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ReferenceCreateResponse",
                  },
                },
              },
            },
            201: {
              description: "Reference created.",
              headers: {
                "Cache-Control": {
                  schema: { type: "string", example: "no-store" },
                },
              },
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ReferenceCreateResponse",
                  },
                },
              },
            },
            400: {
              description: "Invalid request body.",
              headers: {
                "Cache-Control": {
                  schema: { type: "string", example: "no-store" },
                },
              },
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ApiErrorEnvelope" },
                },
              },
            },
            401: {
              description: "Missing or invalid Supabase access token.",
              headers: {
                "Cache-Control": {
                  schema: { type: "string", example: "no-store" },
                },
              },
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ApiErrorEnvelope" },
                },
              },
            },
            500: {
              description: "Internal server error.",
              headers: {
                "Cache-Control": {
                  schema: { type: "string", example: "no-store" },
                },
              },
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ApiErrorEnvelope" },
                },
              },
            },
          },
        },
      },
      "/api/v2/reference-library/assertions": {
        post: {
          summary: "Link a reference to an assertion",
          description:
            "Creates a structured locator linking an authenticated contributor reference to an assertion. The result is mutable and is never cached.",
          tags: ["API v2 - Reference Library"],
          security: [{ SupabaseJwtAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/AssertionReferenceCreateInput",
                },
              },
            },
          },
          responses: {
            201: {
              description: "Assertion-reference link created.",
              headers: {
                "Cache-Control": {
                  schema: { type: "string", example: "no-store" },
                },
              },
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/AssertionReferenceCreateResponse",
                  },
                },
              },
            },
            400: {
              description: "Invalid request body.",
              headers: {
                "Cache-Control": {
                  schema: { type: "string", example: "no-store" },
                },
              },
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ApiErrorEnvelope" },
                },
              },
            },
            401: {
              description: "Missing or invalid Supabase access token.",
              headers: {
                "Cache-Control": {
                  schema: { type: "string", example: "no-store" },
                },
              },
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ApiErrorEnvelope" },
                },
              },
            },
            500: {
              description: "Internal server error.",
              headers: {
                "Cache-Control": {
                  schema: { type: "string", example: "no-store" },
                },
              },
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ApiErrorEnvelope" },
                },
              },
            },
          },
        },
      },
      "/api/v2/reference-library/assets": {
        post: {
          summary: "Upload a private reference working asset",
          description:
            "Stores a private scan or OCR working asset. The upload is never cached. The response contains metadata only: it omits binary content, storage bucket identifiers, and object or location paths, and it does not grant retrieval access.",
          tags: ["API v2 - Reference Library"],
          security: [{ SupabaseJwtAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  $ref: "#/components/schemas/ReferenceWorkingAssetCreateInput",
                },
              },
            },
          },
          responses: {
            201: {
              description:
                "Private asset metadata created; binary content and storage locations are intentionally omitted.",
              headers: {
                "Cache-Control": {
                  schema: { type: "string", example: "no-store" },
                },
              },
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/PrivateReferenceWorkingAssetResponse",
                  },
                },
              },
            },
            400: {
              description: "Invalid multipart form data.",
              headers: {
                "Cache-Control": {
                  schema: { type: "string", example: "no-store" },
                },
              },
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ApiErrorEnvelope" },
                },
              },
            },
            401: {
              description: "Missing or invalid Supabase access token.",
              headers: {
                "Cache-Control": {
                  schema: { type: "string", example: "no-store" },
                },
              },
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ApiErrorEnvelope" },
                },
              },
            },
            500: {
              description: "Internal server error.",
              headers: {
                "Cache-Control": {
                  schema: { type: "string", example: "no-store" },
                },
              },
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ApiErrorEnvelope" },
                },
              },
            },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "API Key",
          description:
            "API key issued via /api/v2/keys/issue (public tier) or the admin UI (partner/admin tiers). Pass as Authorization: Bearer <key>.",
        },
        SupabaseJwtAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            "Supabase access token for an authenticated contributor. Pass as Authorization: Bearer <JWT>.",
        },
      },
      schemas: {
        PaginationMeta: {
          type: "object",
          properties: {
            total: {
              type: "number",
              example: 100,
            },
            page: {
              type: "number",
              example: 1,
            },
            perPage: {
              type: "number",
              example: 20,
            },
            totalPages: {
              type: "number",
              example: 5,
            },
            unclassifiedPeoplesCount: {
              type: "number",
              description:
                "Peoples not reachable through any returnable family, surfaced instead of silently omitted (REQ-108). Only populated on the language-families list.",
              example: 64,
            },
          },
        },
        ApiResponseV2: {
          type: "object",
          properties: {
            data: {
              type: "object",
              description: "Données de la réponse",
            },
            meta: {
              $ref: "#/components/schemas/PaginationMeta",
            },
          },
        },
        SearchResult: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["country", "people", "language", "languageFamily"],
              example: "people",
            },
            id: {
              type: "string",
              example: "PPL_SHONA",
            },
            name: {
              type: "string",
              example: "Shona",
            },
            snippet: {
              type: "string",
              example: "Extrait du contenu...",
            },
            relevance: {
              type: "number",
              example: 0.95,
            },
          },
        },
        SearchResponseData: {
          type: "object",
          description:
            "Search result data. Each entity kind is returned in its own array, already ordered — an exact name match first (accent- and case-insensitive), then ts_rank over the weighted search_vector (migration 043: A = name and autonym, B = exonyms, C/D = prose), multiplied for peoples by a 0.5–1.0 confidence factor. `relevance` is therefore comparable within an array and NOT between arrays: peoples are scored ts_rank × confidence, countries by bare ts_rank, families by a match tier. Order across kinds on `exactMatch`, which means the same thing everywhere.",
          properties: {
            peoples: {
              type: "array",
              items: { $ref: "#/components/schemas/PeopleV2" },
              description:
                "Matching peoples, ranked. Each carries relevance, exactMatch, confidence, languageFamilyName and a snippet whose matched terms are wrapped in [[ ]].",
            },
            countries: {
              type: "array",
              items: { $ref: "#/components/schemas/CountryV2" },
              description:
                "Matching countries, ranked by ts_rank with name_fr outranking etymology. Empty when the request carries only a relation scope.",
            },
            families: {
              type: "array",
              items: { $ref: "#/components/schemas/LanguageFamilyV2" },
              description:
                "Matching language families, name-matched rather than FTS-ranked (no tsvector column on the table)",
            },
            peoplesTotal: {
              type: "integer",
              description:
                "Peoples matching corpus-wide, not the number returned on this page",
              example: 16,
            },
            countriesTotal: {
              type: "integer",
              description: "Countries matching corpus-wide",
              example: 0,
            },
            familiesTotal: {
              type: "integer",
              description: "Language families matching corpus-wide",
              example: 1,
            },
            total: {
              type: "integer",
              description:
                "Sum of the three corpus-wide counts. Changed in 2.2.0: this used to report the size of the returned page, which made it useless for paging.",
              example: 17,
            },
          },
          required: [
            "peoples",
            "countries",
            "families",
            "peoplesTotal",
            "countriesTotal",
            "familiesTotal",
            "total",
          ],
        },
        SearchResponse: {
          type: "object",
          description: "Module #0 envelope for /v2/search (ETNI-38)",
          properties: {
            data: { $ref: "#/components/schemas/SearchResponseData" },
            meta: { $ref: "#/components/schemas/ApiResponseMeta" },
            errors: {
              type: "array",
              items: { $ref: "#/components/schemas/ApiErrorEntry" },
            },
          },
          required: ["data", "meta", "errors"],
        },
        PeopleSummaryV2: {
          type: "object",
          description:
            "Lightweight people reference embedded in a name record.",
          properties: {
            id: {
              type: "string",
              description: "Identifiant PPL_*",
              example: "PPL_JIENG",
            },
            nameMain: { type: "string", example: "Jieng" },
            autonym: {
              type: ["string", "null"],
              description: "Self-appellation (endonym), when known",
              example: "Jieng",
            },
            slug: {
              type: "string",
              description: "URL slug — the PPL_* id",
              example: "PPL_JIENG",
            },
          },
          required: ["id", "nameMain", "autonym", "slug"],
        },
        NameRecordV2: {
          type: "object",
          description:
            "A single name-variant record (endonym | exonym | historical_spelling | surname).",
          properties: {
            id: { type: "string", format: "uuid" },
            peopleId: { type: "string", example: "PPL_JIENG" },
            nameText: { type: "string", example: "Dinka" },
            nameType: {
              type: "string",
              enum: ["endonym", "exonym", "historical_spelling", "surname"],
              example: "exonym",
            },
            languageOfOrigin: { type: ["string", "null"], example: "din" },
            meaning: { type: ["string", "null"] },
            periodLabel: { type: ["string", "null"] },
            imposedBy: {
              type: ["string", "null"],
              example: "colonial administration",
            },
            impositionPeriod: { type: ["string", "null"] },
            whyProblematic: { type: ["string", "null"] },
            contemporaryUsage: { type: ["string", "null"] },
            sortRank: { type: "integer", example: 1 },
            people: {
              oneOf: [
                { $ref: "#/components/schemas/PeopleSummaryV2" },
                { type: "null" },
              ],
            },
          },
          required: [
            "id",
            "peopleId",
            "nameText",
            "nameType",
            "sortRank",
            "people",
          ],
        },
        ListNamesData: {
          type: "object",
          description: "GET /v2/names result data.",
          properties: {
            names: {
              type: "array",
              items: { $ref: "#/components/schemas/NameRecordV2" },
            },
            total: { type: "integer", example: 2 },
          },
          required: ["names", "total"],
        },
        ListNamesResponse: {
          type: "object",
          description: "Module #0 envelope for /v2/names (ETNI-471)",
          properties: {
            data: { $ref: "#/components/schemas/ListNamesData" },
            meta: { $ref: "#/components/schemas/ApiResponseMeta" },
            errors: {
              type: "array",
              items: { $ref: "#/components/schemas/ApiErrorEntry" },
            },
          },
          required: ["data", "meta", "errors"],
        },
        ComparisonEntity: {
          type: "object",
          description:
            "One compared entity. Section keys are the strict-model content keys for its type; a section absent from the source fiche is an explicit `null`, never omitted.",
          properties: {
            type: {
              type: "string",
              enum: ["peuple", "pays", "famille"],
              description: "Internal AFRIK entity type",
            },
            id: {
              type: "string",
              description: "PPL_*, ISO 3166-1 alpha-3, or FLG_* id",
              example: "PPL_SHONA",
            },
            label: { type: "string", example: "Shona" },
          },
          required: ["type", "id", "label"],
          additionalProperties: {
            description:
              "Comparable section value (nullable), keyed by content section name (e.g. appellations, origins, culture).",
          },
        },
        CompareData: {
          type: "object",
          description: "GET /v2/compare result data.",
          properties: {
            entityType: {
              type: "string",
              enum: ["peoples", "countries", "language-families"],
            },
            entities: {
              type: "array",
              minItems: 2,
              maxItems: 3,
              items: { $ref: "#/components/schemas/ComparisonEntity" },
            },
          },
          required: ["entityType", "entities"],
        },
        CompareResponse: {
          type: "object",
          description: "Module #0 envelope for /v2/compare (ETNI-480)",
          properties: {
            data: { $ref: "#/components/schemas/CompareData" },
            meta: { $ref: "#/components/schemas/ApiResponseMeta" },
            errors: {
              type: "array",
              items: { $ref: "#/components/schemas/ApiErrorEntry" },
            },
          },
          required: ["data", "meta", "errors"],
        },
        CountryV2: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Code ISO 3166-1 alpha-3",
              example: "ZWE",
            },
            nameFr: {
              type: "string",
              example: "Zimbabwe",
            },
            nameOfficial: {
              type: "string",
              example: "Republic of Zimbabwe",
            },
            etymology: {
              type: "string",
            },
            content: {
              type: "object",
              description: "Contenu évolutif en JSONB",
            },
          },
        },
        PeopleV2: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Identifiant PPL_*",
              example: "PPL_SHONA",
            },
            nameMain: {
              type: "string",
              example: "Shona",
            },
            languageFamilyId: {
              type: "string",
              description: "Identifiant FLG_*",
              example: "FLG_BANTU",
            },
            currentCountries: {
              type: "array",
              items: {
                type: "string",
              },
              example: ["ZWE", "MOZ"],
            },
            content: {
              type: "object",
              description: "Contenu évolutif en JSONB",
            },
          },
        },
        LanguageFamilyV2: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Identifiant FLG_*",
              example: "FLG_BANTU",
            },
            nameFr: {
              type: "string",
              example: "Bantou",
            },
            nameEn: {
              type: "string",
              example: "Bantu",
            },
            peopleCount: {
              type: "integer",
              minimum: 0,
              description:
                "Number of afrik_peoples rows carrying this family's id, computed from stored rows (REQ-108) — not the fiche-declared associatedPeoples length.",
              example: 28,
            },
            associatedPeoples: {
              type: "array",
              description:
                "Canonical associated peoples derived from afrik_peoples.language_family_id.",
              items: {
                type: "object",
                required: ["name", "peopleId"],
                properties: {
                  name: {
                    type: "string",
                    example: "Shona",
                  },
                  peopleId: {
                    type: "string",
                    description: "Stable PPL_* identifier.",
                    example: "PPL_SHONA",
                  },
                },
              },
            },
            content: {
              type: "object",
              description:
                "Evolutionary JSONB content. Its associatedPeoples property is a legacy compatibility copy derived from the canonical top-level array.",
            },
          },
        },
        Error: {
          type: "object",
          properties: {
            error: {
              type: "string",
              example: "Resource not found",
            },
          },
        },
        // -----------------------------------------------------------------
        // Module #0 — Source Transparency Fabric (ETNI-29)
        // -----------------------------------------------------------------
        ApiResponseMeta: {
          type: "object",
          description:
            "Envelope meta block for Module #0 responses. Always carries license + attribution (AR8). Optionally includes pagination, confidence score, and pinned-version URL.",
          properties: {
            license: { type: "string", example: "CC-BY-SA-4.0" },
            attribution: {
              type: "string",
              example: "EthniAfrica — ethniafrica.com",
            },
            confidence: {
              type: ["number", "null"],
              example: 73,
              description: "Score 0–100 if applicable",
            },
            pinned_url: {
              type: ["string", "null"],
              example: "https://ethniafrica.com/peuples/yoruba@v4",
            },
            pagination: {
              $ref: "#/components/schemas/PaginationMeta",
            },
          },
          required: ["license", "attribution"],
        },
        ApiErrorEntry: {
          type: "object",
          description:
            "Error taxonomy entry returned inside the envelope `errors[]` array.",
          properties: {
            code: {
              type: "string",
              enum: [
                "ILLEGAL_TRANSITION",
                "INTERNAL_ERROR",
                "INVALID_PARAM",
                "NOT_FOUND",
                "RATE_LIMITED",
                "SEMANTIC_ERROR",
                "UNAUTHENTICATED",
                "UNAUTHORIZED",
                "UNAVAILABLE",
                "VALIDATION_ERROR",
              ],
              example: "NOT_FOUND",
            },
            message: { type: "string", example: "Source not found" },
            field: {
              type: ["string", "null"],
              description:
                "Field path that triggered the error (validation only)",
            },
          },
          required: ["code", "message"],
        },
        ApiErrorEnvelope: {
          type: "object",
          description: "Envelope returned on any non-2xx Module #0 response.",
          properties: {
            data: { type: "null" },
            meta: { $ref: "#/components/schemas/ApiResponseMeta" },
            errors: {
              type: "array",
              items: { $ref: "#/components/schemas/ApiErrorEntry" },
              minItems: 1,
            },
          },
          required: ["data", "meta", "errors"],
        },
        PeoplesListEnvelope: {
          type: "object",
          properties: {
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/PeopleV2" },
            },
            meta: {
              allOf: [
                { $ref: "#/components/schemas/ApiResponseMeta" },
                { required: ["pagination"] },
              ],
            },
            errors: {
              type: "array",
              items: { $ref: "#/components/schemas/ApiErrorEntry" },
              maxItems: 0,
            },
          },
          required: ["data", "meta", "errors"],
        },
        PeopleDetailEnvelope: {
          type: "object",
          properties: {
            data: { $ref: "#/components/schemas/PeopleV2" },
            meta: { $ref: "#/components/schemas/ApiResponseMeta" },
            errors: {
              type: "array",
              items: { $ref: "#/components/schemas/ApiErrorEntry" },
              maxItems: 0,
            },
          },
          required: ["data", "meta", "errors"],
        },
        CountriesListEnvelope: {
          type: "object",
          properties: {
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/CountryV2" },
            },
            meta: {
              allOf: [
                { $ref: "#/components/schemas/ApiResponseMeta" },
                { required: ["pagination"] },
              ],
            },
            errors: {
              type: "array",
              items: { $ref: "#/components/schemas/ApiErrorEntry" },
              maxItems: 0,
            },
          },
          required: ["data", "meta", "errors"],
        },
        CountryDetailEnvelope: {
          type: "object",
          properties: {
            data: { $ref: "#/components/schemas/CountryV2" },
            meta: { $ref: "#/components/schemas/ApiResponseMeta" },
            errors: {
              type: "array",
              items: { $ref: "#/components/schemas/ApiErrorEntry" },
              maxItems: 0,
            },
          },
          required: ["data", "meta", "errors"],
        },
        LanguageFamiliesListEnvelope: {
          type: "object",
          properties: {
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/LanguageFamilyV2" },
            },
            meta: {
              allOf: [
                { $ref: "#/components/schemas/ApiResponseMeta" },
                { required: ["pagination"] },
              ],
            },
            errors: {
              type: "array",
              items: { $ref: "#/components/schemas/ApiErrorEntry" },
              maxItems: 0,
            },
          },
          required: ["data", "meta", "errors"],
        },
        LanguageFamilyDetailEnvelope: {
          type: "object",
          properties: {
            data: { $ref: "#/components/schemas/LanguageFamilyV2" },
            meta: { $ref: "#/components/schemas/ApiResponseMeta" },
            errors: {
              type: "array",
              items: { $ref: "#/components/schemas/ApiErrorEntry" },
              maxItems: 0,
            },
          },
          required: ["data", "meta", "errors"],
        },
        ApiKeyIssueEnvelope: {
          type: "object",
          properties: {
            data: {
              type: "object",
              properties: {
                key: {
                  type: "string",
                  description: "Raw API key, shown only once.",
                },
                tier: { type: "string", const: "public" },
                note: { type: "string" },
              },
              required: ["key", "tier", "note"],
            },
            meta: { $ref: "#/components/schemas/ApiResponseMeta" },
            errors: {
              type: "array",
              items: { $ref: "#/components/schemas/ApiErrorEntry" },
              maxItems: 0,
            },
          },
          required: ["data", "meta", "errors"],
        },
        Source: {
          type: "object",
          description:
            "Canonical bibliographic entry. Structured fields are nullable only during the lossless legacy-citation compatibility boundary.",
          properties: {
            id: { type: "string", format: "uuid" },
            sourceKey: {
              type: ["string", "null"],
              description:
                "Stable source key. Null only for legacy entries awaiting review.",
            },
            sourceKind: {
              type: ["string", "null"],
              enum: [
                "intergovernmental",
                "government",
                "official_statistics",
                "linguistic_reference",
                "academic",
                "community",
                "repository",
                "archive",
                "discovery",
                "ai_generated",
                "unknown",
                null,
              ],
            },
            tier: {
              type: ["string", "null"],
              enum: ["official", "referenced", "unverified", null],
              description:
                "Authority the source carries. Null means the citation has not been tiered yet.",
            },
            identifiers: {
              type: ["object", "null"],
              additionalProperties: { type: "string" },
              description:
                "Bibliographic or archival identifiers such as ISBN, DOI, catalogue, or call number.",
            },
            title: { type: "string" },
            url: { type: ["string", "null"] },
            pinnedUrl: { type: ["string", "null"] },
            year: { type: ["integer", "null"] },
            author: { type: ["string", "null"] },
            publisher: { type: ["string", "null"] },
            resolvable: { type: ["boolean", "null"] },
            lastVerifiedAt: {
              type: ["string", "null"],
              format: "date-time",
            },
            policy: {
              type: "object",
              properties: {
                key: { type: "string" },
                tier: {
                  type: "string",
                  enum: ["official", "referenced", "unverified"],
                },
                sourceKind: { type: "string" },
              },
              required: ["key", "tier", "sourceKind"],
            },
          },
          required: ["id", "title", "policy"],
        },
        SourceResponse: {
          type: "object",
          properties: {
            data: { $ref: "#/components/schemas/Source" },
            meta: { $ref: "#/components/schemas/ApiResponseMeta" },
            errors: {
              type: "array",
              items: { $ref: "#/components/schemas/ApiErrorEntry" },
            },
          },
        },
        SourceListResponse: {
          type: "object",
          properties: {
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/Source" },
            },
            meta: { $ref: "#/components/schemas/ApiResponseMeta" },
            errors: {
              type: "array",
              items: { $ref: "#/components/schemas/ApiErrorEntry" },
            },
          },
        },
        // -----------------------------------------------------------------
        // Reference library (ETNI-667)
        // -----------------------------------------------------------------
        ReferenceSource: {
          type: "object",
          description:
            "Structured bibliographic reference returned by the contributor reference library.",
          properties: {
            id: { type: "string", format: "uuid" },
            source_key: { type: "string", maxLength: 160 },
            title: { type: "string", maxLength: 1000 },
            author: { type: "string" },
            year: { type: "integer", minimum: 1000, maximum: 9999 },
            source_kind: {
              type: "string",
              enum: [
                "intergovernmental",
                "government",
                "official_statistics",
                "linguistic_reference",
                "academic",
                "community",
                "repository",
                "archive",
              ],
            },
            tier: {
              type: "string",
              enum: ["official", "referenced", "unverified"],
            },
            identifiers: {
              type: "object",
              additionalProperties: { type: "string" },
            },
            publisher: { type: ["string", "null"] },
            url: { type: ["string", "null"], format: "uri" },
          },
          required: [
            "id",
            "source_key",
            "title",
            "author",
            "year",
            "source_kind",
            "tier",
            "identifiers",
            "publisher",
            "url",
          ],
        },
        ReferenceCreateInput: {
          type: "object",
          properties: {
            source_key: { type: "string", minLength: 1, maxLength: 160 },
            title: { type: "string", minLength: 1, maxLength: 1000 },
            authors: {
              type: "array",
              minItems: 1,
              maxItems: 20,
              items: { type: "string", minLength: 1, maxLength: 300 },
            },
            publication_year: {
              type: "integer",
              minimum: 1000,
              maximum: 9999,
            },
            source_kind: { $ref: "#/components/schemas/ReferenceSourceKind" },
            tier: {
              type: "string",
              enum: ["official", "referenced", "unverified"],
            },
            identifiers: {
              type: "object",
              additionalProperties: { type: "string", maxLength: 300 },
              default: {},
            },
            publisher: { type: ["string", "null"], maxLength: 500 },
            url: { type: ["string", "null"], format: "uri" },
          },
          required: [
            "source_key",
            "title",
            "authors",
            "publication_year",
            "source_kind",
            "tier",
          ],
        },
        ReferenceSourceKind: {
          type: "string",
          enum: [
            "intergovernmental",
            "government",
            "official_statistics",
            "linguistic_reference",
            "academic",
            "community",
            "repository",
            "archive",
          ],
        },
        ReferenceCreateResult: {
          type: "object",
          properties: {
            source: { $ref: "#/components/schemas/ReferenceSource" },
            created: {
              type: "boolean",
              description:
                "True when a new source was created; false when an existing matching source was returned.",
            },
          },
          required: ["source", "created"],
        },
        AssertionReferenceCreateInput: {
          type: "object",
          properties: {
            assertion_id: { type: "string", format: "uuid" },
            source_id: { type: "string", format: "uuid" },
            locator_type: {
              type: "string",
              enum: ["page", "folio", "section", "timestamp"],
            },
            locator_value: { type: "string", minLength: 1, maxLength: 500 },
          },
          required: [
            "assertion_id",
            "source_id",
            "locator_type",
            "locator_value",
          ],
        },
        AssertionReference: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            assertion_id: { type: "string", format: "uuid" },
            source_id: { type: "string", format: "uuid" },
            locator_type: {
              type: "string",
              enum: ["page", "folio", "section", "timestamp"],
            },
            locator_value: { type: "string" },
            review_status: {
              type: "string",
              enum: ["verified", "review_required"],
            },
          },
          required: [
            "id",
            "assertion_id",
            "source_id",
            "locator_type",
            "locator_value",
            "review_status",
          ],
        },
        ReferenceWorkingAssetCreateInput: {
          type: "object",
          description:
            "Multipart private working-asset upload. The submitted file is write-only and never returned by this API.",
          properties: {
            sourceId: { type: "string", format: "uuid" },
            assetKind: { type: "string", enum: ["scan", "ocr"] },
            file: {
              type: "string",
              format: "binary",
              writeOnly: true,
              description: "Private scan or OCR asset to store.",
            },
          },
          required: ["sourceId", "assetKind", "file"],
        },
        PrivateReferenceWorkingAsset: {
          type: "object",
          description:
            "Metadata for a private working asset. Responses intentionally omit binary content, bucket identifiers, and storage object or location paths; this endpoint does not grant asset retrieval access.",
          properties: {
            id: { type: "string", format: "uuid" },
            sourceId: { type: "string", format: "uuid" },
            assetKind: { type: "string", enum: ["scan", "ocr"] },
            filename: { type: "string" },
            contentType: { type: "string" },
            byteSize: { type: "integer", minimum: 1, maximum: 26214400 },
            rightsStatus: {
              type: "string",
              enum: ["private"],
              description: "The asset remains private to the working library.",
            },
            createdAt: { type: "string", format: "date-time" },
          },
          required: [
            "id",
            "sourceId",
            "assetKind",
            "filename",
            "contentType",
            "byteSize",
            "rightsStatus",
            "createdAt",
          ],
        },
        ReferenceSearchResponse: {
          type: "object",
          properties: {
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/ReferenceSource" },
            },
            meta: { $ref: "#/components/schemas/ApiResponseMeta" },
            errors: {
              type: "array",
              items: { $ref: "#/components/schemas/ApiErrorEntry" },
              maxItems: 0,
            },
          },
          required: ["data", "meta", "errors"],
        },
        ReferenceCreateResponse: {
          type: "object",
          properties: {
            data: { $ref: "#/components/schemas/ReferenceCreateResult" },
            meta: { $ref: "#/components/schemas/ApiResponseMeta" },
            errors: {
              type: "array",
              items: { $ref: "#/components/schemas/ApiErrorEntry" },
              maxItems: 0,
            },
          },
          required: ["data", "meta", "errors"],
        },
        AssertionReferenceCreateResponse: {
          type: "object",
          properties: {
            data: { $ref: "#/components/schemas/AssertionReference" },
            meta: { $ref: "#/components/schemas/ApiResponseMeta" },
            errors: {
              type: "array",
              items: { $ref: "#/components/schemas/ApiErrorEntry" },
              maxItems: 0,
            },
          },
          required: ["data", "meta", "errors"],
        },
        PrivateReferenceWorkingAssetResponse: {
          type: "object",
          properties: {
            data: { $ref: "#/components/schemas/PrivateReferenceWorkingAsset" },
            meta: { $ref: "#/components/schemas/ApiResponseMeta" },
            errors: {
              type: "array",
              items: { $ref: "#/components/schemas/ApiErrorEntry" },
              maxItems: 0,
            },
          },
          required: ["data", "meta", "errors"],
        },
        OralNarrative: {
          type: "object",
          description:
            "A public, approved, rights-cleared oral narrative. This representation intentionally excludes transcripts, media locators, collector details, and restricted identity metadata.",
          properties: {
            id: { type: "string", format: "uuid" },
            narrativeCode: { type: "string", example: "ORL_YORUBA_MEMORY_001" },
            narratorDisplayName: { type: ["string", "null"] },
            community: { type: "string" },
            languageCode: { type: "string", example: "yor" },
            narrativeKind: {
              type: "string",
              enum: ["tradition", "testimony", "memory", "story"],
            },
            summary: { type: ["string", "null"] },
            variantOf: { type: ["string", "null"], format: "uuid" },
          },
          required: [
            "id",
            "narrativeCode",
            "narratorDisplayName",
            "community",
            "languageCode",
            "narrativeKind",
            "summary",
            "variantOf",
          ],
        },
        OralNarrativeListResponse: {
          type: "object",
          properties: {
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/OralNarrative" },
            },
            meta: { $ref: "#/components/schemas/ApiResponseMeta" },
            errors: {
              type: "array",
              items: { $ref: "#/components/schemas/ApiErrorEntry" },
            },
          },
        },
        ConfidenceRecord: {
          type: "object",
          description:
            "Pre-computed confidence record for a Module #1 fiche. Populated by the `recompute_confidence(entity_type, entity_id)` Postgres function.",
          properties: {
            entityType: {
              type: "string",
              enum: ["people", "language-family"],
            },
            entityId: { type: "string", example: "PPL_SHONA" },
            score: {
              type: ["number", "null"],
              minimum: 0,
              maximum: 100,
              example: 73,
            },
            sourceCount: { type: "integer", minimum: 0 },
            avgSourceQuality: {
              type: ["number", "null"],
              minimum: 0,
              maximum: 1,
            },
            lastHumanAuditAt: {
              type: ["string", "null"],
              format: "date-time",
            },
            openFlagCount: { type: "integer", minimum: 0 },
            recomputedAt: {
              type: ["string", "null"],
              format: "date-time",
            },
          },
          required: ["entityType", "entityId", "sourceCount", "openFlagCount"],
        },
        ConfidenceResponse: {
          type: "object",
          properties: {
            data: { $ref: "#/components/schemas/ConfidenceRecord" },
            meta: { $ref: "#/components/schemas/ApiResponseMeta" },
            errors: {
              type: "array",
              items: { $ref: "#/components/schemas/ApiErrorEntry" },
            },
          },
        },
        // -----------------------------------------------------------------
        // Epic 13 — Colonization & Resistances: fragmentation (FR85)
        // -----------------------------------------------------------------
        ColonialOrigin: {
          type: "object",
          description:
            "Present only once the colonial-borders dataset (Story 13.3) documents the pair (NFR31 — additive, optional).",
          properties: {
            layerId: { type: "string" },
            sourceIds: { type: "array", items: { type: "string" } },
          },
          required: ["layerId", "sourceIds"],
        },
        FragmentationBorderPair: {
          type: "object",
          properties: {
            a: { type: "string", example: "GHA" },
            b: { type: "string", example: "TGO" },
            colonialOrigin: { $ref: "#/components/schemas/ColonialOrigin" },
          },
          required: ["a", "b"],
        },
        FragmentationCountry: {
          type: "object",
          properties: {
            iso3: { type: "string", example: "GHA" },
            nameFr: { type: "string", example: "Ghana" },
            populationShare: {
              type: "number",
              minimum: 0,
              maximum: 1,
              example: 0.62,
            },
            assertionId: {
              type: ["string", "null"],
              description:
                "Backing assertion id, null when no per-field assertion exists yet for this fiche (bulk-migrated data predates the contribution workflow).",
            },
          },
          required: ["iso3", "nameFr", "populationShare", "assertionId"],
        },
        PeopleFragmentation: {
          type: "object",
          description:
            "Derived strictly from afrik_people_countries + content.demography.distributionByCountry — no data foundation of its own (Epic 13).",
          properties: {
            peopleId: { type: "string", example: "PPL_EWE" },
            autonym: { type: ["string", "null"] },
            exonym: { type: ["string", "null"] },
            countryCount: { type: "integer", minimum: 2 },
            countries: {
              type: "array",
              items: { $ref: "#/components/schemas/FragmentationCountry" },
            },
            borderPairs: {
              type: "array",
              items: { $ref: "#/components/schemas/FragmentationBorderPair" },
            },
          },
          required: [
            "peopleId",
            "autonym",
            "exonym",
            "countryCount",
            "countries",
            "borderPairs",
          ],
        },
        PeopleFragmentationResponse: {
          type: "object",
          properties: {
            data: { $ref: "#/components/schemas/PeopleFragmentation" },
            meta: { $ref: "#/components/schemas/ApiResponseMeta" },
            errors: {
              type: "array",
              items: { $ref: "#/components/schemas/ApiErrorEntry" },
            },
          },
          required: ["data", "meta", "errors"],
        },
        // -----------------------------------------------------------------
        // Epic 11 — Hidden Links Graph: relations (Story 11.7, ETNI-508)
        // -----------------------------------------------------------------
        RelationNeighbor: {
          type: "object",
          properties: {
            id: { type: "string", example: "PPL_EWE" },
            nameMain: { type: "string" },
            languageFamilyId: { type: "string", example: "FLG_KWA" },
          },
          required: ["id", "nameMain", "languageFamilyId"],
        },
        RelationPeriod: {
          type: "object",
          properties: {
            startYear: { type: ["integer", "null"] },
            endYear: { type: ["integer", "null"] },
            label: { type: "string" },
          },
          required: ["startYear", "endYear", "label"],
        },
        RelationConfidence: {
          type: ["object", "null"],
          properties: {
            score: { type: "number", minimum: 0, maximum: 100 },
            sourceCount: { type: ["integer", "null"], minimum: 0 },
          },
          required: ["score", "sourceCount"],
        },
        SourcedRelationItem: {
          type: "object",
          description:
            "Sourced (never derived) relation, from the perspective of the ego people (Story 11.7).",
          properties: {
            relationId: { type: "string", example: "REL_SONINKE_MANDE_TRADE" },
            type: {
              type: "string",
              enum: ["migratory", "commercial", "religious"],
            },
            direction: {
              type: "string",
              enum: ["a_to_b", "b_to_a", "bidirectional"],
            },
            otherPeople: { $ref: "#/components/schemas/RelationNeighbor" },
            period: { $ref: "#/components/schemas/RelationPeriod" },
            description: { type: "string" },
            confidence: { $ref: "#/components/schemas/RelationConfidence" },
          },
          required: [
            "relationId",
            "type",
            "direction",
            "otherPeople",
            "period",
            "description",
            "confidence",
          ],
        },
        DerivedRelationItem: {
          type: "object",
          description:
            "Read-time-computed linguistic link (FR73) — structurally distinct from a sourced relation, never a flag on a shared shape.",
          properties: {
            type: { type: "string", enum: ["linguistic"] },
            derived: { type: "boolean", enum: [true] },
            basis: { type: "string", enum: ["sharedLanguageFamily"] },
            languageFamilyId: { type: "string", example: "FLG_KWA" },
            otherPeople: { $ref: "#/components/schemas/RelationNeighbor" },
          },
          required: [
            "type",
            "derived",
            "basis",
            "languageFamilyId",
            "otherPeople",
          ],
        },
        EgoNetwork: {
          type: "object",
          properties: {
            peopleId: { type: "string", example: "PPL_EWE" },
            sourced: {
              type: "array",
              items: { $ref: "#/components/schemas/SourcedRelationItem" },
            },
            derived: {
              type: "array",
              items: { $ref: "#/components/schemas/DerivedRelationItem" },
            },
          },
          required: ["peopleId", "sourced", "derived"],
        },
        EgoNetworkResponse: {
          type: "object",
          properties: {
            data: { $ref: "#/components/schemas/EgoNetwork" },
            meta: { $ref: "#/components/schemas/ApiResponseMeta" },
            errors: {
              type: "array",
              items: { $ref: "#/components/schemas/ApiErrorEntry" },
            },
          },
          required: ["data", "meta", "errors"],
        },
        RelationSourceRef: {
          type: "object",
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            url: { type: ["string", "null"] },
            tier: {
              type: ["string", "null"],
              enum: ["official", "referenced", "unverified", null],
            },
          },
          required: ["id", "title", "url", "tier"],
        },
        RelationRecord: {
          type: "object",
          description:
            "Non-ego-centered relation record — both sides exposed directly (peopleIdA/peopleIdB) rather than as a single neighbor (Story 11.7).",
          properties: {
            id: { type: "string", example: "REL_SONINKE_MANDE_TRADE" },
            relationType: {
              type: "string",
              enum: ["migratory", "commercial", "religious"],
            },
            peopleIdA: { type: "string", example: "PPL_SONINKE" },
            peopleIdB: { type: "string", example: "PPL_MANDE" },
            direction: {
              type: "string",
              enum: ["a_to_b", "b_to_a", "bidirectional"],
            },
            period: { $ref: "#/components/schemas/RelationPeriod" },
            description: { type: "string" },
            sources: {
              type: "array",
              items: { $ref: "#/components/schemas/RelationSourceRef" },
            },
            confidence: { $ref: "#/components/schemas/RelationConfidence" },
          },
          required: [
            "id",
            "relationType",
            "peopleIdA",
            "peopleIdB",
            "direction",
            "period",
            "description",
            "sources",
            "confidence",
          ],
        },
        RelationListResponse: {
          type: "object",
          properties: {
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/RelationRecord" },
            },
            meta: { $ref: "#/components/schemas/ApiResponseMeta" },
            errors: {
              type: "array",
              items: { $ref: "#/components/schemas/ApiErrorEntry" },
            },
          },
          required: ["data", "meta", "errors"],
        },
        RelationDetailResponse: {
          type: "object",
          properties: {
            data: { $ref: "#/components/schemas/RelationRecord" },
            meta: { $ref: "#/components/schemas/ApiResponseMeta" },
            errors: {
              type: "array",
              items: { $ref: "#/components/schemas/ApiErrorEntry" },
            },
          },
          required: ["data", "meta", "errors"],
        },
        // -----------------------------------------------------------------
        // Epic 12 — Migrations timeline (FR83, Story 12.5, ETNI-518)
        // -----------------------------------------------------------------
        GeoJSONGeometry: {
          type: "object",
          description:
            "Schematic (corridor-level) GeoJSON geometry — never a claim of precise historical borders.",
          properties: {
            type: {
              type: "string",
              enum: ["LineString", "MultiLineString", "Polygon"],
            },
            coordinates: {
              type: "array",
              description:
                "Nesting depth depends on `type` ([lon, lat] pairs for LineString; arrays thereof for MultiLineString/Polygon).",
            },
          },
          required: ["type", "coordinates"],
        },
        MigrationTimeRange: {
          type: "object",
          properties: {
            startYear: {
              type: "integer",
              description:
                "Astronomical year integer; negative values are BCE.",
              example: -3000,
            },
            endYear: { type: "integer", example: -1500 },
            datingNote: { type: ["string", "null"] },
          },
          required: ["startYear", "endYear", "datingNote"],
        },
        MigrationPeopleRef: {
          type: "object",
          properties: {
            id: { type: "string", example: "PPL_KONGO" },
            nameMain: { type: "string" },
            role: { type: ["string", "null"], example: "destination" },
          },
          required: ["id", "nameMain", "role"],
        },
        MigrationSourceRef: {
          type: "object",
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            url: { type: ["string", "null"] },
            tier: {
              type: ["string", "null"],
              enum: ["official", "referenced", "unverified", null],
            },
          },
          required: ["id", "title", "url", "tier"],
        },
        MigrationEventSummary: {
          type: "object",
          description:
            "List-view migration event — no geometry (AR18 payload-size discipline).",
          properties: {
            id: { type: "string", example: "MGR_BANTU_HOMELAND_DISPERSAL" },
            nameMain: { type: "string" },
            migrationGroup: {
              type: ["string", "null"],
              example: "bantu-expansion",
            },
            eventType: {
              type: "string",
              enum: [
                "expansion",
                "trade_route",
                "forced_displacement",
                "pastoral_movement",
                // Epic 13 (ETNI-530) — colonization event types (FR87, FR89).
                "fragmentation",
                "displacement",
                "imposed_name",
                "resistance",
              ],
            },
            classificationStatus: {
              type: "string",
              enum: [
                "consensual",
                "contested",
                "colonial-legacy",
                "reconstructive",
              ],
            },
            timeRange: { $ref: "#/components/schemas/MigrationTimeRange" },
            summary: { type: "string" },
          },
          required: [
            "id",
            "nameMain",
            "migrationGroup",
            "eventType",
            "classificationStatus",
            "timeRange",
            "summary",
          ],
        },
        MigrationEventDetail: {
          type: "object",
          description:
            "Detail-view migration event, incl. geometry, narrative, peoples and sources.",
          allOf: [
            { $ref: "#/components/schemas/MigrationEventSummary" },
            {
              type: "object",
              properties: {
                geometry: { $ref: "#/components/schemas/GeoJSONGeometry" },
                narrative: { type: "string" },
                debate: { type: ["string", "null"] },
                peoples: {
                  type: "array",
                  items: { $ref: "#/components/schemas/MigrationPeopleRef" },
                },
                sources: {
                  type: "array",
                  items: { $ref: "#/components/schemas/MigrationSourceRef" },
                },
              },
              required: [
                "geometry",
                "narrative",
                "debate",
                "peoples",
                "sources",
              ],
            },
          ],
        },
        MigrationListResponse: {
          type: "object",
          properties: {
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/MigrationEventSummary" },
            },
            meta: { $ref: "#/components/schemas/ApiResponseMeta" },
            errors: {
              type: "array",
              items: { $ref: "#/components/schemas/ApiErrorEntry" },
            },
          },
          required: ["data", "meta", "errors"],
        },
        MigrationDetailResponse: {
          type: "object",
          properties: {
            data: { $ref: "#/components/schemas/MigrationEventDetail" },
            meta: { $ref: "#/components/schemas/ApiResponseMeta" },
            errors: {
              type: "array",
              items: { $ref: "#/components/schemas/ApiErrorEntry" },
            },
          },
          required: ["data", "meta", "errors"],
        },
        // -----------------------------------------------------------------
        // Epic 8 — Names Atlas: people names dossier (FR53-FR58, Story 8.6)
        // -----------------------------------------------------------------
        NameRecordSource: {
          type: "object",
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            url: { type: ["string", "null"] },
            year: { type: ["integer", "null"] },
            tier: {
              type: ["string", "null"],
              enum: ["official", "referenced", "unverified", null],
            },
          },
          required: ["id", "title", "url", "year", "tier"],
        },
        NameRecordImposition: {
          type: "object",
          description:
            "Imposed-name context. Present whenever any of its four fields carries data — including contemporaryUsage on non-imposed endonyms (the illustrative dossier shape), so this is not gated on imposedBy alone.",
          properties: {
            imposedBy: { type: ["string", "null"] },
            impositionPeriod: { type: ["string", "null"] },
            whyProblematic: { type: ["string", "null"] },
            contemporaryUsage: { type: ["string", "null"] },
          },
          required: [
            "imposedBy",
            "impositionPeriod",
            "whyProblematic",
            "contemporaryUsage",
          ],
        },
        NameRecordConfidence: {
          type: "object",
          properties: {
            score: { type: "number" },
            recomputedAt: { type: ["string", "null"] },
          },
          required: ["score", "recomputedAt"],
        },
        NameRecord: {
          type: "object",
          description:
            "One name entry in a people's names dossier (endonym, exonym, historical spelling, or surname), with per-record sources and the people's confidence score (AR17 batched, not per-record queries).",
          properties: {
            id: { type: "string", example: "nr-endonym-1" },
            nameText: { type: "string", example: "Jieng" },
            nameType: {
              type: "string",
              enum: ["endonym", "exonym", "historical_spelling", "surname"],
            },
            languageOfOrigin: { type: ["string", "null"], example: "din" },
            meaning: { type: ["string", "null"] },
            periodLabel: { type: ["string", "null"] },
            imposition: {
              oneOf: [
                { $ref: "#/components/schemas/NameRecordImposition" },
                { type: "null" },
              ],
            },
            assertionId: { type: "string" },
            sources: {
              type: "array",
              items: { $ref: "#/components/schemas/NameRecordSource" },
            },
            confidence: {
              oneOf: [
                { $ref: "#/components/schemas/NameRecordConfidence" },
                { type: "null" },
              ],
            },
          },
          required: [
            "id",
            "nameText",
            "nameType",
            "languageOfOrigin",
            "meaning",
            "periodLabel",
            "imposition",
            "assertionId",
            "sources",
            "confidence",
          ],
        },
        PeopleNamesDossier: {
          type: "object",
          properties: {
            peopleId: { type: "string", example: "PPL_DINKA" },
            autonym: { type: ["string", "null"] },
            names: {
              type: "array",
              items: { $ref: "#/components/schemas/NameRecord" },
            },
          },
          required: ["peopleId", "autonym", "names"],
        },
        PeopleNamesDossierResponse: {
          type: "object",
          properties: {
            data: { $ref: "#/components/schemas/PeopleNamesDossier" },
            meta: { $ref: "#/components/schemas/ApiResponseMeta" },
            errors: {
              type: "array",
              items: { $ref: "#/components/schemas/ApiErrorEntry" },
            },
          },
          required: ["data", "meta", "errors"],
        },
        // -----------------------------------------------------------------
        // Epic 7 — Language family tree branch (FR48, NFR3)
        // -----------------------------------------------------------------
        FamilyTreeBranchNode: {
          type: "object",
          properties: {
            id: { type: "string", example: "PPL_BAKONGO" },
            nameMain: { type: "string", example: "Bakongo" },
            classificationStatus: {
              type: ["string", "null"],
              enum: [
                "consensual",
                "contested",
                "colonial-legacy",
                "reconstructive",
                null,
              ],
            },
          },
          required: ["id", "nameMain", "classificationStatus"],
        },
        LanguageFamilyTreeBranchResponse: {
          type: "object",
          properties: {
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/FamilyTreeBranchNode" },
            },
            meta: { $ref: "#/components/schemas/ApiResponseMeta" },
            errors: {
              type: "array",
              items: { $ref: "#/components/schemas/ApiErrorEntry" },
            },
          },
          required: ["data", "meta", "errors"],
        },
        // -----------------------------------------------------------------
        // Epic 7 — Classification tree skeleton (FR48, FR33)
        // -----------------------------------------------------------------
        FamilyTreeBranch: {
          type: "object",
          properties: {
            iso639_3: { type: "string", example: "swa" },
            name: { type: "string", example: "Swahili" },
            peopleCount: { type: "integer", minimum: 0, example: 3 },
          },
          required: ["iso639_3", "name", "peopleCount"],
        },
        FamilyTreeSkeletonFamily: {
          type: "object",
          description:
            "Lightweight family header for the tree skeleton. Deliberately omits the full editorial `content` JSONB (see LanguageFamilyV2) to keep the skeleton payload small (ETNI-463 AC3: ≤ 15 KB for the largest family).",
          properties: {
            id: {
              type: "string",
              description: "Identifiant FLG_*",
              example: "FLG_BANTU",
            },
            nameFr: { type: "string", example: "Bantou" },
            nameEn: { type: "string", example: "Bantu" },
            classificationStatus: {
              type: ["string", "null"],
              enum: [
                "consensual",
                "contested",
                "colonial-legacy",
                "reconstructive",
                null,
              ],
            },
          },
          required: ["id", "nameFr"],
        },
        LanguageFamilyTree: {
          type: "object",
          description:
            "Classification tree skeleton: the family's languages (branches) with linked-people counts, plus peoples in the family not linked to any of its languages.",
          properties: {
            family: { $ref: "#/components/schemas/FamilyTreeSkeletonFamily" },
            branches: {
              type: "array",
              items: { $ref: "#/components/schemas/FamilyTreeBranch" },
            },
            branchProvenance: {
              type: "string",
              enum: ["language-corpus", "people-fiches"],
              description:
                "Which source produced `branches`: the language corpus, or a reconstruction from the ISO codes the people fiches declare. `afrik_languages` is empty in every deployed database, so `people-fiches` is the normal case.",
            },
            declaredBranches: {
              type: "array",
              description:
                "Branch names the family fiche states in `generalInfo.branches`. No field ties a people to one of them, so they are a declared register rather than parents in the tree.",
              items: { type: "string" },
              example: ["Atlantique central", "Peul-Sérère"],
            },
            unlinkedPeopleCount: { type: "integer", minimum: 0, example: 1 },
          },
          required: [
            "family",
            "branches",
            "branchProvenance",
            "declaredBranches",
            "unlinkedPeopleCount",
          ],
        },
        LanguageFamilyTreeResponse: {
          type: "object",
          properties: {
            data: { $ref: "#/components/schemas/LanguageFamilyTree" },
            meta: { $ref: "#/components/schemas/ApiResponseMeta" },
            errors: {
              type: "array",
              items: { $ref: "#/components/schemas/ApiErrorEntry" },
            },
          },
          required: ["data", "meta", "errors"],
        },
        // -----------------------------------------------------------------
        // Epic 3 — Pinned-version URLs (ETNI-51)
        // -----------------------------------------------------------------
        PeopleRevisionItem: {
          type: "object",
          description:
            "A single published revision in the people revision history list.",
          properties: {
            version: {
              type: "integer",
              minimum: 1,
              example: 3,
              description: "Monotonically increasing publication version",
            },
            published_at: {
              type: ["string", "null"],
              format: "date-time",
              example: "2026-05-21T10:00:00.000Z",
            },
            moderator_pseudonym: {
              type: ["string", "null"],
              example: "mod-aaaabbbb",
              description:
                "Privacy-preserving pseudonym derived from the moderator's internal id",
            },
            reason: {
              type: ["string", "null"],
              example: "Demographics update",
            },
            pinned_url: {
              type: "string",
              example: "/api/v2/peoples/PPL_YORUBA/versions/3",
              description:
                "Stable URL for this pinned version (AR14). Cache-Control: s-maxage=31536000, immutable.",
            },
          },
          required: ["version", "pinned_url"],
        },
        CursorPaginationMeta: {
          type: "object",
          description: "Cursor-based pagination meta (no offset).",
          properties: {
            limit: {
              type: "integer",
              minimum: 1,
              maximum: 100,
              example: 20,
            },
            next_cursor: {
              type: ["integer", "null"],
              example: 4,
              description:
                "Version to pass as ?cursor= on the next request. Null when no more pages.",
            },
          },
          required: ["limit", "next_cursor"],
        },
        PeopleRevisionListMeta: {
          type: "object",
          properties: {
            license: { type: "string", example: "CC-BY-SA-4.0" },
            attribution: {
              type: "string",
              example: "EthniAfrica — ethniafrica.com",
            },
            pagination: { $ref: "#/components/schemas/CursorPaginationMeta" },
          },
          required: ["license", "attribution", "pagination"],
        },
        PeopleRevisionListResponse: {
          type: "object",
          description:
            "Cursor-paginated list of published revisions ordered by version DESC.",
          properties: {
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/PeopleRevisionItem" },
            },
            meta: { $ref: "#/components/schemas/PeopleRevisionListMeta" },
            errors: {
              type: "array",
              items: { $ref: "#/components/schemas/ApiErrorEntry" },
            },
          },
          required: ["data", "meta", "errors"],
        },
        PeopleVersionSnapshotResponse: {
          type: "object",
          description:
            "Full published snapshot at a pinned version. Data is read from the immutable revision record, never from the live entity (AR14). Response is permanently cacheable (AR18).",
          properties: {
            data: {
              type: "object",
              description:
                "Full denormalised entity state as stored at publication time (snapshot_jsonb)",
            },
            meta: { $ref: "#/components/schemas/ApiResponseMeta" },
            errors: {
              type: "array",
              items: { $ref: "#/components/schemas/ApiErrorEntry" },
            },
          },
          required: ["data", "meta", "errors"],
        },
        DoctrineEntry: {
          type: "object",
          description: "Editorial-doctrine row (MDX source stored in DB).",
          properties: {
            slug: {
              type: "string",
              enum: [
                "review_policy",
                "naming_convention",
                "ai_disclosure",
                "license_attribution",
              ],
            },
            title: { type: "string" },
            mdxSource: { type: "string" },
            version: { type: "integer", minimum: 1 },
            publishedAt: {
              type: ["string", "null"],
              format: "date-time",
            },
          },
          required: ["slug", "title", "mdxSource", "version"],
        },
        DoctrineResponse: {
          type: "object",
          properties: {
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/DoctrineEntry" },
            },
            meta: { $ref: "#/components/schemas/ApiResponseMeta" },
            errors: {
              type: "array",
              items: { $ref: "#/components/schemas/ApiErrorEntry" },
            },
          },
        },
        // -----------------------------------------------------------------
        // Epic 3 — Revisions feed (ETNI-52)
        // -----------------------------------------------------------------
        FeedRevisionItem: {
          type: "object",
          description:
            "A single published revision entry in the cross-entity revisions feed.",
          properties: {
            entity_type: {
              type: "string",
              enum: ["people", "country", "languageFamily"],
              example: "people",
            },
            entity_id: {
              type: "string",
              example: "PPL_YORUBA",
              description:
                "Stable entity identifier (PPL_*, FLG_*, ISO 3166-1 alpha-3)",
            },
            slug: {
              type: "string",
              example: "ppl_yoruba",
              description: "URL-friendly lowercase form of entity_id",
            },
            version: {
              type: "integer",
              minimum: 1,
              example: 3,
              description: "Monotonically increasing publication version",
            },
            published_at: {
              type: ["string", "null"],
              format: "date-time",
              example: "2026-05-21T12:00:00.000Z",
            },
            pinned_url: {
              type: "string",
              example: "/api/v2/peoples/PPL_YORUBA/versions/3",
              description: "Stable pinned-version URL (AR14)",
            },
            summary: {
              type: ["string", "null"],
              example: "Demographics update",
              description: "Editorial reason for the revision, if provided",
            },
          },
          required: [
            "entity_type",
            "entity_id",
            "slug",
            "version",
            "pinned_url",
          ],
        },
        FeedCursorPaginationMeta: {
          type: "object",
          description: "Cursor-based pagination meta for the revisions feed.",
          properties: {
            limit: {
              type: "integer",
              minimum: 1,
              maximum: 100,
              example: 20,
            },
            next_cursor: {
              type: ["string", "null"],
              example: "MjAyNi0wNS0yMVQxMjowMDowMC4wMDB...",
              description:
                "Opaque base64url cursor. Pass as ?cursor= on the next request. Null when no more pages.",
            },
          },
          required: ["limit", "next_cursor"],
        },
        FeedRevisionListMeta: {
          type: "object",
          properties: {
            license: { type: "string", example: "CC-BY-SA-4.0" },
            attribution: {
              type: "string",
              example: "EthniAfrica — ethniafrica.com",
            },
            pagination: {
              $ref: "#/components/schemas/FeedCursorPaginationMeta",
            },
          },
          required: ["license", "attribution", "pagination"],
        },
        FeedRevisionListResponse: {
          type: "object",
          description:
            "Cursor-paginated list of published revisions across all entity types (JSON format).",
          properties: {
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/FeedRevisionItem" },
            },
            meta: { $ref: "#/components/schemas/FeedRevisionListMeta" },
            errors: {
              type: "array",
              items: { $ref: "#/components/schemas/ApiErrorEntry" },
            },
          },
          required: ["data", "meta", "errors"],
        },
        // -----------------------------------------------------------------
        // Epic 3 — Contributor flags (ETNI-62)
        // -----------------------------------------------------------------
        FlagKind: {
          type: "string",
          enum: [
            "inaccurate",
            "missing-source",
            "broken-url",
            "offensive",
            "correction-proposal",
            "other",
          ],
          example: "inaccurate",
        },
        FlagStatus: {
          type: "string",
          enum: [
            "open",
            "under_review",
            "accepted",
            "rejected",
            "withdrawn",
            "duplicate",
          ],
          example: "open",
        },
        FlagCreateInput: {
          type: "object",
          required: [
            "target_type",
            "target_id",
            "flag_kind",
            "reason_text",
            "antibot",
          ],
          properties: {
            target_type: {
              type: "string",
              example: "people",
              description:
                "AFRIK entity type (people, country, language, language_family)",
            },
            target_id: {
              type: "string",
              example: "PPL_YORUBA",
              description:
                "Stable AFRIK identifier of the entity being flagged",
            },
            target_field_path: {
              type: "string",
              example: "demographics.population",
              description: "Optional dotted path to the disputed field",
            },
            flag_kind: {
              $ref: "#/components/schemas/FlagKind",
            },
            reason_text: {
              type: "string",
              minLength: 10,
              maxLength: 2000,
              example: "Population figure appears outdated vs. 2024 census.",
            },
            counter_source_url: {
              type: "string",
              format: "uri",
              example: "https://example.org/census/2024",
            },
            counter_source_citation: {
              type: "string",
              maxLength: 2000,
              example: "National Statistics Office, 2024 census, table 12.",
            },
            proposed_rewrite: {
              type: "string",
              maxLength: 5000,
              example: "Update the population figure using the 2024 census.",
            },
            antibot: {
              type: "object",
              writeOnly: true,
              required: [
                "salt",
                "nonce",
                "difficultyBits",
                "expiresAt",
                "signature",
              ],
              description:
                "A solved proof-of-work challenge, obtained from GET /v2/antibot/challenge. Single-use and short-lived. Nothing in it identifies the caller.",
              properties: {
                salt: { type: "string", example: "9f2c1ab4d7e60358" },
                nonce: { type: "string", example: "418209" },
                difficultyBits: { type: "integer", example: 20 },
                expiresAt: { type: "integer", example: 1788080000000 },
                signature: { type: "string", example: "3b1f…" },
              },
            },
            elapsedMs: {
              type: "integer",
              writeOnly: true,
              example: 18400,
              description:
                "Milliseconds the form was open before submission. A submission faster than a person could have written it is refused.",
            },
          },
          example: {
            target_type: "people",
            target_id: "PPL_YORUBA",
            target_field_path: "demographics.population",
            flag_kind: "inaccurate",
            reason_text:
              "Population figure appears outdated compared with the latest census.",
            counter_source_url: "https://example.org/census/2024",
            counter_source_citation:
              "National Statistics Office, 2024 census, table 12.",
            proposed_rewrite:
              "Update the population figure using the 2024 census.",
            antibot: {
              salt: "9f2c1ab4d7e60358",
              nonce: "418209",
              difficultyBits: 20,
              expiresAt: 1788080000000,
              signature: "3b1f…",
            },
            elapsedMs: 18400,
          },
        },
        FlagCreated: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
              example: "9c81ca0d-ae45-4f08-8f53-2ac0a9673abd",
            },
            public_slug: {
              type: "string",
              example: "flag-7kq3m2",
            },
            status: { $ref: "#/components/schemas/FlagStatus" },
            created_at: {
              type: "string",
              format: "date-time",
              example: "2026-07-24T10:15:30.000Z",
            },
          },
          required: ["id", "public_slug", "status", "created_at"],
          example: {
            id: "9c81ca0d-ae45-4f08-8f53-2ac0a9673abd",
            public_slug: "flag-7kq3m2",
            status: "open",
            created_at: "2026-07-24T10:15:30.000Z",
          },
        },
        PublicFlag: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
              example: "9c81ca0d-ae45-4f08-8f53-2ac0a9673abd",
            },
            public_slug: { type: "string", example: "flag-7kq3m2" },
            target_type: {
              type: ["string", "null"],
              example: "people",
            },
            target_id: {
              type: ["string", "null"],
              example: "PPL_YORUBA",
            },
            target_field_path: {
              type: ["string", "null"],
              example: "demographics.population",
            },
            assertion_id: {
              type: ["string", "null"],
              format: "uuid",
              example: null,
            },
            flag_kind: { $ref: "#/components/schemas/FlagKind" },
            reason_text: {
              type: ["string", "null"],
              example:
                "Population figure appears outdated compared with the latest census.",
            },
            counter_source_url: {
              type: ["string", "null"],
              format: "uri",
              example: "https://example.org/census/2024",
            },
            counter_source_citation: {
              type: ["string", "null"],
              example: "National Statistics Office, 2024 census, table 12.",
            },
            proposed_rewrite: {
              type: ["string", "null"],
              example: "Update the population figure using the 2024 census.",
            },
            contributor_id: {
              type: ["string", "null"],
              format: "uuid",
              example: "bdbb6b42-3890-4c80-ac96-f732908d17c7",
            },
            severity: {
              type: ["string", "null"],
              enum: ["low", "medium", "high", "critical", null],
              example: null,
            },
            auto_generated: { type: "boolean", example: false },
            status: { $ref: "#/components/schemas/FlagStatus" },
            created_at: {
              type: "string",
              format: "date-time",
              example: "2026-07-24T10:15:30.000Z",
            },
            updated_at: {
              type: ["string", "null"],
              format: "date-time",
              example: "2026-07-24T11:00:00.000Z",
            },
            resolved_at: {
              type: ["string", "null"],
              format: "date-time",
              example: null,
            },
          },
          required: [
            "id",
            "public_slug",
            "target_type",
            "target_id",
            "target_field_path",
            "assertion_id",
            "flag_kind",
            "reason_text",
            "counter_source_url",
            "counter_source_citation",
            "proposed_rewrite",
            "contributor_id",
            "severity",
            "auto_generated",
            "status",
            "created_at",
            "updated_at",
            "resolved_at",
          ],
          example: {
            id: "9c81ca0d-ae45-4f08-8f53-2ac0a9673abd",
            public_slug: "flag-7kq3m2",
            target_type: "people",
            target_id: "PPL_YORUBA",
            target_field_path: "demographics.population",
            assertion_id: null,
            flag_kind: "inaccurate",
            reason_text:
              "Population figure appears outdated compared with the latest census.",
            counter_source_url: "https://example.org/census/2024",
            counter_source_citation:
              "National Statistics Office, 2024 census, table 12.",
            proposed_rewrite:
              "Update the population figure using the 2024 census.",
            contributor_id: "bdbb6b42-3890-4c80-ac96-f732908d17c7",
            severity: null,
            auto_generated: false,
            status: "open",
            created_at: "2026-07-24T10:15:30.000Z",
            updated_at: "2026-07-24T11:00:00.000Z",
            resolved_at: null,
          },
        },
        FlagCursorPaginationMeta: {
          type: "object",
          description: "Opaque cursor pagination for the public flags list.",
          properties: {
            limit: {
              type: "integer",
              minimum: 1,
              maximum: 100,
              default: 20,
              example: 20,
            },
            next_cursor: {
              type: ["string", "null"],
              example: "MjAyNi0wNy0yNFQxMDoxNTozMC4wMDBafDljODFjYTBk",
              description:
                "Opaque cursor to pass unchanged as ?cursor=. Null when no more pages remain.",
            },
          },
          required: ["limit", "next_cursor"],
        },
        FlagListMeta: {
          type: "object",
          properties: {
            license: { type: "string", example: "CC-BY-SA-4.0" },
            attribution: {
              type: "string",
              example: "EthniAfrica — ethniafrica.com",
            },
            pagination: {
              $ref: "#/components/schemas/FlagCursorPaginationMeta",
            },
          },
          required: ["license", "attribution", "pagination"],
        },
        FlagCreatedResponse: {
          type: "object",
          properties: {
            data: { $ref: "#/components/schemas/FlagCreated" },
            meta: { $ref: "#/components/schemas/ApiResponseMeta" },
            errors: {
              type: "array",
              items: { $ref: "#/components/schemas/ApiErrorEntry" },
              maxItems: 0,
            },
          },
          required: ["data", "meta", "errors"],
        },
        FlagListResponse: {
          type: "object",
          properties: {
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/PublicFlag" },
            },
            meta: { $ref: "#/components/schemas/FlagListMeta" },
            errors: {
              type: "array",
              items: { $ref: "#/components/schemas/ApiErrorEntry" },
              maxItems: 0,
            },
          },
          required: ["data", "meta", "errors"],
        },
        FlagDetailResponse: {
          type: "object",
          properties: {
            data: { $ref: "#/components/schemas/PublicFlag" },
            meta: { $ref: "#/components/schemas/ApiResponseMeta" },
            errors: {
              type: "array",
              items: { $ref: "#/components/schemas/ApiErrorEntry" },
              maxItems: 0,
            },
          },
          required: ["data", "meta", "errors"],
        },
        // -----------------------------------------------------------------
        // Epic 10 — Smart Quiz (FR65/FR66, Story 10.7, ETNI-496)
        // -----------------------------------------------------------------
        QuizScopeOption: {
          type: "object",
          description:
            "One track a session can be drawn from. `playable` is false when the track cannot fill a session of eight — it is still listed, and still counted, rather than hidden.",
          properties: {
            id: { type: "string", example: "GHA" },
            labelFr: { type: "string", example: "Ghana" },
            activeQuestionCount: { type: "integer", minimum: 0 },
            playable: { type: "boolean" },
          },
          required: ["id", "labelFr", "activeQuestionCount", "playable"],
        },
        QuizThemeOption: {
          type: "object",
          description:
            "One domain of content a session can be narrowed to, counted across the whole corpus.",
          properties: {
            id: {
              type: "string",
              enum: [
                "noms",
                "langues",
                "parente-linguistique",
                "territoire",
                "rites-et-culture",
                "croyances",
                "royaumes-et-histoire",
                "organisation",
                "migrations",
              ],
            },
            labelFr: { type: "string", example: "Croyances" },
            activeQuestionCount: { type: "integer", minimum: 0 },
            playable: { type: "boolean" },
          },
          required: ["id", "labelFr", "activeQuestionCount", "playable"],
        },
        QuizScopesData: {
          type: "object",
          description: "GET /v2/quiz/scopes result data.",
          properties: {
            countries: {
              type: "array",
              items: { $ref: "#/components/schemas/QuizScopeOption" },
            },
            families: {
              type: "array",
              items: { $ref: "#/components/schemas/QuizScopeOption" },
            },
            themes: {
              type: "array",
              items: { $ref: "#/components/schemas/QuizThemeOption" },
            },
            mixed: { $ref: "#/components/schemas/QuizScopeOption" },
            random: { $ref: "#/components/schemas/QuizScopeOption" },
          },
          required: ["countries", "families", "mixed", "random"],
        },
        QuizScopesResponse: {
          type: "object",
          description: "Module #0 envelope for /v2/quiz/scopes (ETNI-496)",
          properties: {
            data: { $ref: "#/components/schemas/QuizScopesData" },
            meta: { $ref: "#/components/schemas/ApiResponseMeta" },
            errors: {
              type: "array",
              items: { $ref: "#/components/schemas/ApiErrorEntry" },
            },
          },
          required: ["data", "meta", "errors"],
        },
        QuizScope: {
          type: "object",
          description: "The track the returned session was drawn from.",
          properties: {
            kind: {
              type: "string",
              enum: ["country", "family", "mixed", "random"],
            },
            entityId: { type: ["string", "null"], example: "GHA" },
            labelFr: { type: "string", example: "Ghana" },
          },
          required: ["kind", "entityId", "labelFr"],
        },
        QuizSourceRef: {
          type: "object",
          description:
            "The single highest-tier resolvable source backing the question's assertion (official or referenced, FR65 gate).",
          properties: {
            title: { type: "string" },
            year: { type: ["integer", "null"] },
            tier: {
              type: ["string", "null"],
              enum: ["official", "referenced", "unverified", null],
            },
            url: { type: ["string", "null"] },
          },
          required: ["title", "year", "tier", "url"],
        },
        QuizEntityLink: {
          type: "object",
          description:
            "The AFRIK entity the question's field value is drawn from.",
          properties: {
            type: { type: "string", enum: ["people", "country"] },
            id: { type: "string", example: "PPL_SHONA" },
            slug: { type: "string", example: "PPL_SHONA" },
            autonym: { type: ["string", "null"] },
            exonym: { type: ["string", "null"] },
          },
          required: ["type", "id", "slug", "autonym", "exonym"],
        },
        QuizOptionValue: {
          description:
            "A plain string for non-name fields, or a structured autonym/exonym name.",
          oneOf: [
            { type: "string" },
            {
              type: "object",
              properties: {
                autonym: { type: "string" },
                exonym: { type: "string" },
              },
              required: ["autonym"],
            },
          ],
        },
        QuizSessionQuestion: {
          type: "object",
          description:
            "One session question. The answer key ships in the payload (correctOption, explanationFr, source) — reveal is client-side.",
          properties: {
            id: { type: "string", format: "uuid" },
            templateId: {
              type: "string",
              description:
                "T1-T5 ask about an atomic fiche field; T6-T11 quote a prose rubric and ask which people it belongs to; T12 asks which of a people's exonyms is contested.",
              enum: [
                "T1",
                "T2",
                "T3",
                "T4",
                "T5",
                "T6",
                "T7",
                "T8",
                "T9",
                "T10",
                "T11",
                "T12",
              ],
            },
            promptFr: { type: "string" },
            stimulusFr: {
              type: ["string", "null"],
              description:
                "Verbatim fiche prose shown above the stem, on the templates whose answer is the subject. Null elsewhere.",
            },
            optionsFr: {
              type: "array",
              minItems: 4,
              maxItems: 4,
              items: { $ref: "#/components/schemas/QuizOptionValue" },
            },
            correctOption: { type: "integer", minimum: 0, maximum: 3 },
            explanationFr: { type: "string" },
            source: { $ref: "#/components/schemas/QuizSourceRef" },
            assertionId: { type: "string", format: "uuid" },
            entity: { $ref: "#/components/schemas/QuizEntityLink" },
          },
          required: [
            "id",
            "templateId",
            "promptFr",
            "stimulusFr",
            "optionsFr",
            "correctOption",
            "explanationFr",
            "source",
            "assertionId",
            "entity",
          ],
        },
        QuizSessionData: {
          type: "object",
          description:
            "GET /v2/quiz/session result data. Questions arrive in the order they are meant to be played: ascending difficulty band, except under `mode=aleatoire`.",
          properties: {
            scope: { $ref: "#/components/schemas/QuizScope" },
            questions: {
              type: "array",
              items: { $ref: "#/components/schemas/QuizSessionQuestion" },
            },
          },
          required: ["scope", "questions"],
        },
        QuizSessionResponse: {
          type: "object",
          description: "Module #0 envelope for /v2/quiz/session (ETNI-496)",
          properties: {
            data: { $ref: "#/components/schemas/QuizSessionData" },
            meta: { $ref: "#/components/schemas/ApiResponseMeta" },
            errors: {
              type: "array",
              items: { $ref: "#/components/schemas/ApiErrorEntry" },
            },
          },
          required: ["data", "meta", "errors"],
        },
        // -----------------------------------------------------------------
        // API key self-service management (ETNI-81)
        // -----------------------------------------------------------------
        ApiKeySummary: {
          type: "object",
          description:
            "One of the caller's own API keys. Never carries the raw key or its hash.",
          properties: {
            id: { type: "string", format: "uuid" },
            label: { type: ["string", "null"] },
            tier: { type: "string", enum: ["public", "partner", "admin"] },
            active: { type: "boolean" },
            key_prefix: { type: ["string", "null"] },
            created_at: { type: "string", format: "date-time" },
            last_used_at: {
              type: ["string", "null"],
              format: "date-time",
            },
            expires_at: {
              type: ["string", "null"],
              format: "date-time",
            },
            revoked_at: {
              type: ["string", "null"],
              format: "date-time",
            },
          },
          required: [
            "id",
            "label",
            "tier",
            "active",
            "key_prefix",
            "created_at",
            "last_used_at",
            "expires_at",
            "revoked_at",
          ],
        },
        ApiKeyCreated: {
          type: "object",
          description:
            "Response to a successful key creation. `key` is the raw key — shown only in this response, never retrievable again.",
          allOf: [
            { $ref: "#/components/schemas/ApiKeySummary" },
            {
              type: "object",
              properties: {
                key: { type: "string" },
              },
              required: ["key"],
            },
          ],
        },
      },
    },
    security: [{ BearerAuth: [] }],
  },
  apis: ["./src/app/api/v2/**/*.ts"],
};

// @req REQ-084
export const swaggerSpecV2 = swaggerJsdoc(options);
