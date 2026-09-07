import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { logger } from "@/lib/api/logger";
import { classifierFor } from "../leafClassifier";
import { overlayTranslation } from "../overlayTranslation";
import type { TranslationRecord } from "../types";

const classify = classifierFor("modele-peuple.json");

function asanteShaped() {
  return {
    id: "PPL_ASANTE",
    nameMain: "Asante",
    languageFamilyId: "FLG_NIGERCONGO",
    currentCountries: ["GHA", "CIV"],
    classificationStatus: "colonial-legacy",
    content: {
      appellations: {
        mainName: "Asante",
        selfAppellation: "Asante / Asantefo",
        exonyms: [
          "Ashanti (variante orthographique anglaise)",
          "Coromantee (terme jamaïcain)",
        ],
        originOfExonyms: "Le terme Ashanti est une variante anglophone.",
        whyProblematic: null,
        contemporaryUsage: "Le terme Asante est officiel au Ghana.",
      },
      origins: {
        ancientOrigins: "Les Asante font partie du groupe Akan.",
        migrationRoutes: ["Depuis Bono-Manso vers Kumase"],
      },
      demography: { totalPopulation: 3000000 },
      sources: [
        {
          title: "Un titre",
          url: "https://x",
          tier: "official",
          notes: "Note en français.",
        },
      ],
    },
  };
}

function record(
  translationKind: TranslationRecord["translationKind"],
  content: Record<string, unknown>
): TranslationRecord {
  return {
    entityType: "people",
    entityId: "PPL_ASANTE",
    lang: "en",
    content,
    translationKind,
    translatedAt: "2026-09-05T10:00:00.000Z",
    sourceHash: "c".repeat(64),
    fieldHashes: {},
    reviewRequired: ["content.appellations.originOfExonyms"],
  };
}

const ENGLISH = {
  content: {
    appellations: {
      exonyms: [
        "Ashanti (English spelling variant)",
        "Coromantee (Jamaican term)",
      ],
      originOfExonyms: "The term Ashanti is an anglophone variant.",
      contemporaryUsage: "The term Asante is official in Ghana.",
    },
    origins: {
      ancientOrigins: "The Asante belong to the Akan group.",
      migrationRoutes: ["From Bono-Manso towards Kumase"],
    },
    sources: [{ notes: "Note in English." }],
  },
};

describe("overlayTranslation (REQ-142, REQ-143)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-142
  it("returns the authored record by reference when there is no translation", () => {
    const authored = asanteShaped();
    expect(overlayTranslation(authored, null, classify)).toBe(authored);
  });

  // @req REQ-142
  it("replaces class-2 leaves and leaves the authored object untouched", () => {
    const authored = asanteShaped();
    const overlaid = overlayTranslation(
      authored,
      record("machine", ENGLISH),
      classify
    );

    expect(overlaid).not.toBe(authored);
    expect(overlaid.content.origins.ancientOrigins).toBe(
      "The Asante belong to the Akan group."
    );
    expect(overlaid.content.origins.migrationRoutes[0]).toBe(
      "From Bono-Manso towards Kumase"
    );
    expect(overlaid.content.sources[0].notes).toBe("Note in English.");
    expect(authored.content.origins.ancientOrigins).toBe(
      "Les Asante font partie du groupe Akan."
    );
  });

  // @req REQ-143
  it("refuses a class-3 leaf at machine provenance so the French shows until reviewed", () => {
    const overlaid = overlayTranslation(
      asanteShaped(),
      record("machine", ENGLISH),
      classify
    );

    expect(overlaid.content.appellations.originOfExonyms).toBe(
      "Le terme Ashanti est une variante anglophone."
    );
    expect(overlaid.content.appellations.contemporaryUsage).toBe(
      "Le terme Asante est officiel au Ghana."
    );
  });

  // @req REQ-143
  it("publishes a class-3 leaf once a human has reviewed the translation", () => {
    const overlaid = overlayTranslation(
      asanteShaped(),
      record("machine_reviewed", ENGLISH),
      classify
    );

    expect(overlaid.content.appellations.originOfExonyms).toBe(
      "The term Ashanti is an anglophone variant."
    );
  });

  // @req REQ-143
  it("never changes a class-1 leaf, whatever the record carries", () => {
    const overlaid = overlayTranslation(
      asanteShaped(),
      record("human", {
        nameMain: "Ashanti",
        content: {
          appellations: { selfAppellation: "Ashantee" },
          sources: [{ title: "Translated title", tier: "unverified" }],
          demography: { totalPopulation: 1 },
        },
      }),
      classify
    );

    expect(overlaid.nameMain).toBe("Asante");
    expect(overlaid.content.appellations.selfAppellation).toBe(
      "Asante / Asantefo"
    );
    expect(overlaid.content.sources[0].title).toBe("Un titre");
    expect(overlaid.content.sources[0].tier).toBe("official");
    expect(overlaid.content.demography.totalPopulation).toBe(3000000);
  });

  // @req REQ-143
  it("takes the translated gloss of a glossed invariant while the name stays verbatim", () => {
    const overlaid = overlayTranslation(
      asanteShaped(),
      record("machine", ENGLISH),
      classify
    );

    expect(overlaid.content.appellations.exonyms).toEqual([
      "Ashanti (English spelling variant)",
      "Coromantee (Jamaican term)",
    ]);
  });

  // @req REQ-143
  it("keeps the authored value when a glossed invariant's name was altered", () => {
    const overlaid = overlayTranslation(
      asanteShaped(),
      record("machine", {
        content: {
          appellations: { exonyms: ["Ashantee (English spelling variant)"] },
        },
      }),
      classify
    );

    expect(overlaid.content.appellations.exonyms[0]).toBe(
      "Ashanti (variante orthographique anglaise)"
    );
  });

  // @req REQ-142
  it("ignores leaves the model does not declare, with one logged warning", () => {
    const overlaid = overlayTranslation(
      asanteShaped(),
      record("human", {
        content: { origins: { invented: "x", ancientOrigins: "Akan." } },
      }),
      classify
    );

    expect(overlaid.content.origins.ancientOrigins).toBe("Akan.");
    expect((overlaid.content.origins as Record<string, unknown>).invented).toBe(
      undefined
    );
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  // @req REQ-142
  it("skips a translated leaf the authored record does not carry", () => {
    const authored = asanteShaped();
    delete (authored.content.origins as { migrationRoutes?: unknown })
      .migrationRoutes;

    const overlaid = overlayTranslation(
      authored,
      record("human", ENGLISH),
      classify
    );

    expect(overlaid.content.origins).not.toHaveProperty("migrationRoutes");
  });
});
