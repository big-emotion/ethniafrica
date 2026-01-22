import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Ethniafrique Atlas API v1",
      version: "1.0.0",
      description:
        "API publique v1 pour accéder aux données démographiques et ethniques de l'Afrique. Cette API fournit des informations sur les régions, pays, ethnies et statistiques démographiques du continent africain.",
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
        name: "Statistics",
        description: "Statistiques globales",
      },
      {
        name: "Regions",
        description: "Opérations sur les régions",
      },
      {
        name: "Countries",
        description: "Opérations sur les pays",
      },
      {
        name: "Ethnicities",
        description: "Opérations sur les ethnies",
      },
      {
        name: "Contributions",
        description: "Contributions publiques",
      },
      {
        name: "Admin",
        description: "Opérations admin (authentification requise)",
      },
    ],
    components: {
      schemas: {
        RegionData: {
          type: "object",
          properties: {
            name: {
              type: "string",
              example: "Afrique du Nord",
            },
            totalPopulation: {
              type: "number",
              example: 274113455,
            },
            countries: {
              type: "object",
              additionalProperties: {
                type: "object",
                properties: {
                  name: {
                    type: "string",
                  },
                  population: {
                    type: "number",
                  },
                  percentageInRegion: {
                    type: "number",
                  },
                  percentageInAfrica: {
                    type: "number",
                  },
                  ethnicityCount: {
                    type: "number",
                  },
                },
              },
            },
            ethnicities: {
              type: "object",
              additionalProperties: {
                type: "object",
                properties: {
                  name: {
                    type: "string",
                  },
                  totalPopulationInRegion: {
                    type: "number",
                  },
                  percentageInRegion: {
                    type: "number",
                  },
                  percentageInAfrica: {
                    type: "number",
                  },
                },
              },
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
      },
    },
  },
  apis: [
    "./src/app/api/**/*.ts",
    "!./src/app/api/v2/**/*.ts", // Exclure v2
    "!./src/app/api/docs/**/*.ts", // Exclure les routes de docs
  ],
};

export const swaggerSpecV1 = swaggerJsdoc(options);
