import { describe, expect, it } from "vitest";
import { swaggerSpecV2 } from "../openapiV2";
import { DOSSIER_VERTICALS } from "@/lib/afrik/parsers/dossierTypes";
import { publicDossierSchema } from "@/api/v2/schemas/dossiers";
import { getDossierBySlug } from "@/lib/dossiers/corpus";

describe("dossier API parity", () => {
  // @req REQ-114
  it("documents the same verticals as the corpus and accepts optional narrative sections", () => {
    expect(swaggerSpecV2).toMatchObject({
      components: {
        schemas: {
          DossierV2: {
            properties: { vertical: { enum: [...DOSSIER_VERTICALS] } },
          },
          DossierChapterV2: {
            properties: {
              readings: { minItems: 0 },
            },
          },
          DossierSummaryV2: {
            properties: { vertical: { enum: [...DOSSIER_VERTICALS] } },
          },
        },
      },
    });
    const dossier = structuredClone(getDossierBySlug("royaume-kongo")!);
    dossier.thesis.figures = [];
    dossier.chapters[0].readings = [];
    expect(publicDossierSchema.safeParse(dossier).success).toBe(true);
  });
});
