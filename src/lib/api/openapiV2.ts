import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.1.0",
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
        name: "API v2 - Flags",
        description: "Content flags and moderation signals (planned)",
      },
      {
        name: "API v2 - Feed",
        description: "Revision feed (planned)",
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
      responses: {
        Unauthorized: {
          description: "Invalid or missing API key",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
              examples: {
                unauthorized: {
                  value: { error: "Unauthorized" },
                },
              },
            },
          },
        },
        Forbidden: {
          description: "Valid key but insufficient tier permissions",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
              examples: {
                forbidden: {
                  value: { error: "Forbidden" },
                },
              },
            },
          },
        },
        RateLimited: {
          description: "Rate limit exceeded",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
              examples: {
                rateLimited: {
                  value: { error: "Too Many Requests" },
                },
              },
            },
          },
        },
        ServiceUnavailable: {
          description: "Backend temporarily unavailable",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
              examples: {
                serviceUnavailable: {
                  value: { error: "Service Unavailable" },
                },
              },
            },
          },
        },
        Module0Unauthorized: {
          description: "Invalid or missing API key",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiErrorEnvelope" },
            },
          },
        },
        Module0Forbidden: {
          description: "Valid key but insufficient tier permissions",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiErrorEnvelope" },
            },
          },
        },
        Module0RateLimited: {
          description: "Rate limit exceeded",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiErrorEnvelope" },
            },
          },
        },
        Module0ServiceUnavailable: {
          description: "Backend temporarily unavailable",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiErrorEnvelope" },
            },
          },
        },
      },
      schemas: {
        PaginationMeta: {
          type: "object",
          properties: {
            total: {
              type: "number",
              examples: [100],
            },
            page: {
              type: "number",
              examples: [1],
            },
            perPage: {
              type: "number",
              examples: [20],
            },
            totalPages: {
              type: "number",
              examples: [5],
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
              examples: ["people"],
            },
            id: {
              type: "string",
              examples: ["PPL_SHONA"],
            },
            name: {
              type: "string",
              examples: ["Shona"],
            },
            snippet: {
              type: "string",
              examples: ["Extrait du contenu..."],
            },
            relevance: {
              type: "number",
              examples: [0.95],
            },
          },
        },
        CountryV2: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Code ISO 3166-1 alpha-3",
              examples: ["ZWE"],
            },
            nameFr: {
              type: "string",
              examples: ["Zimbabwe"],
            },
            nameOfficial: {
              type: "string",
              examples: ["Republic of Zimbabwe"],
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
              examples: ["PPL_SHONA"],
            },
            nameMain: {
              type: "string",
              examples: ["Shona"],
            },
            languageFamilyId: {
              type: "string",
              description: "Identifiant FLG_*",
              examples: ["FLG_BANTU"],
            },
            currentCountries: {
              type: "array",
              items: {
                type: "string",
              },
              examples: [["ZWE", "MOZ"]],
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
              examples: ["FLG_BANTU"],
            },
            nameFr: {
              type: "string",
              examples: ["Bantou"],
            },
            nameEn: {
              type: "string",
              examples: ["Bantu"],
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
              examples: ["Resource not found"],
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
            license: { type: "string", examples: ["CC-BY-SA-4.0"] },
            attribution: {
              type: "string",
              examples: ["Africa History — africahistory.org"],
            },
            confidence: {
              type: ["number", "null"],
              examples: [73],
              description: "Score 0–100 if applicable",
            },
            pinned_url: {
              type: ["string", "null"],
              examples: ["https://africahistory.org/peuples/yoruba@v4"],
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
                "VALIDATION_ERROR",
                "NOT_FOUND",
                "INTERNAL_ERROR",
                "RATE_LIMITED",
                "SERVICE_UNAVAILABLE",
              ],
              examples: ["NOT_FOUND"],
            },
            message: { type: "string", examples: ["Source not found"] },
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
        Source: {
          type: "object",
          description:
            "Canonical bibliographic entry. Columns marked nullable depend on migration 014 (ETNI-22).",
          properties: {
            id: { type: "string", format: "uuid" },
            type: {
              type: ["string", "null"],
              enum: ["primary", "secondary", "tertiary", "ai", null],
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
            entityId: { type: "string", examples: ["PPL_SHONA"] },
            score: {
              type: ["number", "null"],
              minimum: 0,
              maximum: 100,
              examples: [73],
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
              examples: [3],
              description: "Monotonically increasing publication version",
            },
            published_at: {
              type: ["string", "null"],
              format: "date-time",
              examples: ["2026-05-21T10:00:00.000Z"],
            },
            moderator_pseudonym: {
              type: ["string", "null"],
              examples: ["mod-aaaabbbb"],
              description:
                "Privacy-preserving pseudonym derived from the moderator's internal id",
            },
            reason: {
              type: ["string", "null"],
              examples: ["Demographics update"],
            },
            pinned_url: {
              type: "string",
              examples: ["/api/v2/peoples/PPL_YORUBA/versions/3"],
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
              examples: [20],
            },
            next_cursor: {
              type: ["integer", "null"],
              examples: [4],
              description:
                "Version to pass as ?cursor= on the next request. Null when no more pages.",
            },
          },
          required: ["limit", "next_cursor"],
        },
        PeopleRevisionListMeta: {
          type: "object",
          properties: {
            license: { type: "string", examples: ["CC-BY-SA-4.0"] },
            attribution: {
              type: "string",
              examples: ["Africa History — africahistory.org"],
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
        // Flags — planned (ETNI-75)
        // -----------------------------------------------------------------
        FlagV2: {
          type: "object",
          description:
            "Content flag raised against an AFRIK fiche. Populated by moderators and contributors.",
          properties: {
            id: { type: "string", format: "uuid" },
            entityType: {
              type: "string",
              enum: ["people", "language-family", "country"],
            },
            entityId: { type: "string", examples: ["PPL_SHONA"] },
            kind: {
              type: "string",
              enum: [
                "factual_error",
                "missing_source",
                "outdated_data",
                "other",
              ],
            },
            status: {
              type: "string",
              enum: ["open", "resolved", "dismissed"],
            },
            body: { type: ["string", "null"] },
            createdAt: { type: "string", format: "date-time" },
            resolvedAt: { type: ["string", "null"], format: "date-time" },
          },
          required: [
            "id",
            "entityType",
            "entityId",
            "kind",
            "status",
            "createdAt",
          ],
        },
        FlagListResponse: {
          type: "object",
          properties: {
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/FlagV2" },
            },
            meta: { $ref: "#/components/schemas/ApiResponseMeta" },
            errors: {
              type: "array",
              items: { $ref: "#/components/schemas/ApiErrorEntry" },
            },
          },
        },
        FlagResponse: {
          type: "object",
          properties: {
            data: { $ref: "#/components/schemas/FlagV2" },
            meta: { $ref: "#/components/schemas/ApiResponseMeta" },
            errors: {
              type: "array",
              items: { $ref: "#/components/schemas/ApiErrorEntry" },
            },
          },
        },
        // -----------------------------------------------------------------
        // Feed — planned (ETNI-75)
        // -----------------------------------------------------------------
        RevisionFeedItem: {
          type: "object",
          description: "A single revision event in the revision feed.",
          properties: {
            id: { type: "string", format: "uuid" },
            entityType: {
              type: "string",
              enum: ["people", "language-family", "country"],
            },
            entityId: { type: "string", examples: ["PPL_SHONA"] },
            version: { type: "integer", minimum: 1 },
            publishedAt: { type: "string", format: "date-time" },
            moderatorPseudonym: { type: ["string", "null"] },
            reason: { type: ["string", "null"] },
            pinnedUrl: { type: "string" },
          },
          required: [
            "id",
            "entityType",
            "entityId",
            "version",
            "publishedAt",
            "pinnedUrl",
          ],
        },
        RevisionFeedResponse: {
          type: "object",
          properties: {
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/RevisionFeedItem" },
            },
            meta: { $ref: "#/components/schemas/ApiResponseMeta" },
            errors: {
              type: "array",
              items: { $ref: "#/components/schemas/ApiErrorEntry" },
            },
          },
        },
      },
    },
    // Stub paths for planned endpoints not yet implemented
    paths: {
      "/api/v2/flags": {
        get: {
          summary: "List content flags",
          description:
            "Returns a paginated list of content flags raised against AFRIK fiches. **Planned — not yet implemented.**",
          tags: ["API v2 - Flags"],
          parameters: [
            {
              in: "query",
              name: "page",
              schema: { type: "integer", minimum: 1, default: 1 },
            },
            {
              in: "query",
              name: "perPage",
              schema: {
                type: "integer",
                minimum: 1,
                maximum: 100,
                default: 20,
              },
            },
            {
              in: "query",
              name: "entityType",
              schema: {
                type: "string",
                enum: ["people", "language-family", "country"],
              },
              description: "Filter by entity type",
            },
            {
              in: "query",
              name: "status",
              schema: {
                type: "string",
                enum: ["open", "resolved", "dismissed"],
              },
              description: "Filter by flag status",
            },
          ],
          responses: {
            "200": {
              description: "Paginated list of flags",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/FlagListResponse" },
                },
              },
            },
            "400": {
              description: "Validation error",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ApiErrorEnvelope" },
                },
              },
            },
            "401": { $ref: "#/components/responses/Module0Unauthorized" },
            "403": { $ref: "#/components/responses/Module0Forbidden" },
            "429": { $ref: "#/components/responses/Module0RateLimited" },
            "503": { $ref: "#/components/responses/Module0ServiceUnavailable" },
          },
        },
      },
      "/api/v2/flags/{id}": {
        get: {
          summary: "Get a single content flag",
          description:
            "Returns a single content flag by its UUID. **Planned — not yet implemented.**",
          tags: ["API v2 - Flags"],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string", format: "uuid" },
              description: "Flag UUID",
            },
          ],
          responses: {
            "200": {
              description: "Flag envelope",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/FlagResponse" },
                },
              },
            },
            "400": {
              description: "Invalid id",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ApiErrorEnvelope" },
                },
              },
            },
            "401": { $ref: "#/components/responses/Module0Unauthorized" },
            "403": { $ref: "#/components/responses/Module0Forbidden" },
            "404": {
              description: "Flag not found",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ApiErrorEnvelope" },
                },
              },
            },
            "429": { $ref: "#/components/responses/Module0RateLimited" },
            "503": { $ref: "#/components/responses/Module0ServiceUnavailable" },
          },
        },
      },
      "/api/v2/feed/revisions": {
        get: {
          summary: "Cross-entity revision feed",
          description:
            "Returns a reverse-chronological feed of published revisions across all entity types. Supports cursor-based pagination. **Planned — not yet implemented.**",
          tags: ["API v2 - Feed"],
          parameters: [
            {
              in: "query",
              name: "limit",
              schema: {
                type: "integer",
                minimum: 1,
                maximum: 100,
                default: 20,
              },
            },
            {
              in: "query",
              name: "cursor",
              schema: { type: "string" },
              description:
                "Opaque pagination cursor from the previous page's meta",
            },
            {
              in: "query",
              name: "entityType",
              schema: {
                type: "string",
                enum: ["people", "language-family", "country"],
              },
              description: "Filter by entity type",
            },
          ],
          responses: {
            "200": {
              description: "Revision feed envelope",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/RevisionFeedResponse" },
                },
              },
            },
            "400": {
              description: "Validation error",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ApiErrorEnvelope" },
                },
              },
            },
            "401": { $ref: "#/components/responses/Module0Unauthorized" },
            "403": { $ref: "#/components/responses/Module0Forbidden" },
            "429": { $ref: "#/components/responses/Module0RateLimited" },
            "503": { $ref: "#/components/responses/Module0ServiceUnavailable" },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
  },
  apis: ["./src/app/api/v2/**/*.ts"],
};

export const swaggerSpecV2 = swaggerJsdoc(options);
