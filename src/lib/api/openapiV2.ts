import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Ethniafrique Atlas API v2 - AFRIK",
      version: "2.0.0",
      description:
        "API publique v2 basée sur la méthodologie AFRIK. Identifiants stables (FLG_*, PPL_*, codes ISO 3166-1 alpha-3) et format de réponse standardisé avec pagination. Cette API fournit un accès structuré aux données ethnographiques et linguistiques de l'Afrique.\n\n" +
        "## Response envelope shapes\n\n" +
        "Two envelope shapes coexist on `/api/v2/*` during the Module #0 rollout:\n\n" +
        "- **Module #0 endpoints** (`/sources`, `/sources/{id}`, `/doctrine`, `/confidence/{entityType}/{entityId}`, and future `/assertions`) return the new envelope: `{ data, meta: { license, attribution, pagination?, confidence?, pinned_url? }, errors: [] }`. License and attribution are always present (AR8); `errors[]` is `[]` on success and populated on non-2xx responses.\n" +
        "- **Legacy v2 endpoints** (`/peoples`, `/countries`, `/language-families`, `/search`) still use the older shape: `{ data, meta: { total, page, perPage, totalPages } }` for list responses and `{ data }` for item responses. They do not surface `license`, `attribution`, or an `errors` array.\n\n" +
        "Both shapes are stable for the lifetime of v2. Convergence onto the Module #0 envelope across all endpoints is tracked as a separate follow-up ticket; until then, treat the envelope shape as endpoint-scoped.",
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
        name: "API v2 - Feed",
        description:
          "Revision feed — cursor-paginated Atom + JSON feed of recent published revisions (FR38, AR19, NFR32)",
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "API Key",
          description:
            "API key issued via /api/v2/keys/issue (public tier) or the admin UI (partner/admin tiers). Pass as Authorization: Bearer <key>.",
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
            "FTS search result data. Peoples and countries are returned in separate arrays, ranked by ts_rank_cd × confidence boost.",
          properties: {
            peoples: {
              type: "array",
              items: { $ref: "#/components/schemas/PeopleV2" },
              description:
                "Matching peoples ordered by confidence-boosted relevance",
            },
            countries: {
              type: "array",
              items: { $ref: "#/components/schemas/CountryV2" },
              description: "Matching countries ordered by FTS relevance",
            },
            total: {
              type: "integer",
              description: "Combined count of peoples + countries returned",
              example: 5,
            },
          },
          required: ["peoples", "countries", "total"],
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
            content: {
              type: "object",
              description: "Contenu évolutif en JSONB",
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
              example: "Africa History — africahistory.org",
            },
            confidence: {
              type: "number",
              nullable: true,
              example: 73,
              description: "Score 0–100 if applicable",
            },
            pinned_url: {
              type: "string",
              nullable: true,
              example: "https://africahistory.org/peuples/yoruba@v4",
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
              enum: ["VALIDATION_ERROR", "NOT_FOUND", "INTERNAL_ERROR"],
              example: "NOT_FOUND",
            },
            message: { type: "string", example: "Source not found" },
            field: {
              type: "string",
              nullable: true,
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
        Source: {
          type: "object",
          description:
            "Canonical bibliographic entry. Columns marked nullable depend on migration 014 (ETNI-22).",
          properties: {
            id: { type: "string", format: "uuid" },
            type: {
              type: "string",
              nullable: true,
              enum: ["primary", "secondary", "tertiary", "ai", null],
            },
            title: { type: "string" },
            url: { type: "string", nullable: true },
            pinnedUrl: { type: "string", nullable: true },
            year: { type: "integer", nullable: true },
            author: { type: "string", nullable: true },
            publisher: { type: "string", nullable: true },
            resolvable: { type: "boolean", nullable: true },
            lastVerifiedAt: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
          },
          required: ["id", "title"],
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
              type: "number",
              nullable: true,
              minimum: 0,
              maximum: 100,
              example: 73,
            },
            sourceCount: { type: "integer", minimum: 0 },
            avgSourceQuality: {
              type: "number",
              nullable: true,
              minimum: 0,
              maximum: 1,
            },
            lastHumanAuditAt: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
            openFlagCount: { type: "integer", minimum: 0 },
            recomputedAt: {
              type: "string",
              format: "date-time",
              nullable: true,
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
              type: "string",
              format: "date-time",
              nullable: true,
              example: "2026-05-21T10:00:00.000Z",
            },
            moderator_pseudonym: {
              type: "string",
              nullable: true,
              example: "mod-aaaabbbb",
              description:
                "Privacy-preserving pseudonym derived from the moderator's internal id",
            },
            reason: {
              type: "string",
              nullable: true,
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
              type: "integer",
              nullable: true,
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
              example: "Africa History — africahistory.org",
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
              type: "string",
              format: "date-time",
              nullable: true,
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
              type: "string",
              format: "date-time",
              nullable: true,
              example: "2026-05-21T12:00:00.000Z",
            },
            pinned_url: {
              type: "string",
              example: "/api/v2/peoples/PPL_YORUBA/versions/3",
              description: "Stable pinned-version URL (AR14)",
            },
            summary: {
              type: "string",
              nullable: true,
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
              type: "string",
              nullable: true,
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
              example: "Africa History — africahistory.org",
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
      },
    },
    security: [{ BearerAuth: [] }],
  },
  apis: ["./src/app/api/v2/**/*.ts"],
};

export const swaggerSpecV2 = swaggerJsdoc(options);
