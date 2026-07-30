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
          "Contributor flags — submit editorial flags on AFRIK entities. Requires age confirmation (FR45, AR24).",
      },
      {
        name: "API v2 - Reference Library",
        description:
          "Authenticated contributor workspace for structured references, assertion locators, and private working assets.",
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
              example: "Africa History — africahistory.org",
            },
            confidence: {
              type: ["number", "null"],
              example: 73,
              description: "Score 0–100 if applicable",
            },
            pinned_url: {
              type: ["string", "null"],
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
              enum: [
                "VALIDATION_ERROR",
                "NOT_FOUND",
                "SEMANTIC_ERROR",
                "INTERNAL_ERROR",
                "UNAUTHENTICATED",
                "AGE_CONFIRMATION_REQUIRED",
                "UNAUTHORIZED",
                "RATE_LIMITED",
                "UNAVAILABLE",
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
            evidenceTier: {
              type: ["integer", "null"],
              enum: [1, 2, null],
              description:
                "Authorized evidence tier. Null entries require review.",
            },
            identifiers: {
              type: ["object", "null"],
              additionalProperties: { type: "string" },
              description:
                "Bibliographic or archival identifiers such as ISBN, DOI, catalogue, or call number.",
            },
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
            policy: {
              type: "object",
              properties: {
                key: { type: "string" },
                admission: { type: "string" },
                evidenceTier: { type: ["integer", "null"], enum: [1, 2, null] },
                sourceKind: { type: "string" },
                publishable: { type: "boolean" },
              },
              required: [
                "key",
                "admission",
                "evidenceTier",
                "sourceKind",
                "publishable",
              ],
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
            evidence_tier: { type: ["integer", "null"], enum: [1, 2, null] },
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
            "evidence_tier",
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
            evidence_tier: { type: ["integer", "null"], enum: [1, 2, null] },
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
            "evidence_tier",
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
        LanguageFamilyTree: {
          type: "object",
          description:
            "Classification tree skeleton: the family's languages (branches) with linked-people counts, plus peoples in the family not linked to any of its languages.",
          properties: {
            family: { $ref: "#/components/schemas/LanguageFamilyV2" },
            branches: {
              type: "array",
              items: { $ref: "#/components/schemas/FamilyTreeBranch" },
            },
            unlinkedPeopleCount: { type: "integer", minimum: 0, example: 1 },
          },
          required: ["family", "branches", "unlinkedPeopleCount"],
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
            "turnstile_token",
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
            turnstile_token: {
              type: "string",
              minLength: 1,
              writeOnly: true,
              example: "0.ABC123.turnstile-response",
              description: "Cloudflare Turnstile verification token",
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
            turnstile_token: "0.ABC123.turnstile-response",
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
              example: "Africa History — africahistory.org",
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
      },
    },
    security: [{ BearerAuth: [] }],
  },
  apis: ["./src/app/api/v2/**/*.ts"],
};

// @req REQ-084
export const swaggerSpecV2 = swaggerJsdoc(options);
