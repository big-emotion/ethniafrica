import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Ethniafrique Atlas API v2 - AFRIK",
      version: "2.0.0",
      description:
        "API publique AFRIK pour accéder aux données sur les peuples, familles linguistiques et pays d'Afrique. Cette API utilise la méthodologie AFRIK avec des identifiants stables et un format de réponse standardisé.",
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
        name: "Search",
        description: "Recherche multi-entités",
      },
      {
        name: "Countries",
        description: "Opérations sur les pays",
      },
      {
        name: "Peoples",
        description: "Opérations sur les peuples",
      },
      {
        name: "Language Families",
        description: "Opérations sur les familles linguistiques",
      },
    ],
    components: {
      schemas: {
        Error: {
          type: "object",
          properties: {
            error: {
              type: "object",
              properties: {
                code: {
                  type: "string",
                  example: "NOT_FOUND",
                },
                message: {
                  type: "string",
                  example: "Resource not found",
                },
              },
            },
          },
        },
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
        ApiResponse: {
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
        Country: {
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
        People: {
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
              description:
                "Contenu évolutif en JSONB avec les 8 sections AFRIK",
            },
          },
        },
        LanguageFamily: {
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
      },
    },
  },
  apis: [
    "./src/app/api/v2/**/*.ts", // Only v2 API routes
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
