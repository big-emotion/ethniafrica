import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/queries/afrik/translations", () => ({
  getAfrikTranslation: vi.fn(),
}));

vi.mock("@/lib/api/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { logger } from "@/lib/api/logger";
import { classifierFor } from "@/lib/afrik/translations/leafClassifier";
import { fieldHashes, sourceHash } from "@/lib/afrik/translations/hashing";
import type { TranslationRecord } from "@/lib/afrik/translations/types";
import { getAfrikTranslation } from "@/lib/supabase/queries/afrik/translations";
import { attachTranslation, withTranslation } from "../translations";

const classify = classifierFor("modele-peuple.json");

function authoredAsante() {
  return {
    id: "PPL_ASANTE",
    nameMain: "Asante",
    languageFamilyId: "FLG_NIGERCONGO",
    currentCountries: ["GHA"],
    content: {
      appellations: {
        selfAppellation: "Asante / Asantefo",
        originOfExonyms: "Le terme Ashanti est une variante anglophone.",
      },
      origins: { ancientOrigins: "Les Asante font partie du groupe Akan." },
      sources: [{ title: "Un titre", url: null, tier: "official" as const }],
    },
  };
}

function englishRecord(
  overrides: Partial<TranslationRecord> = {}
): TranslationRecord {
  const authored = authoredAsante();
  return {
    entityType: "people",
    entityId: "PPL_ASANTE",
    lang: "en",
    content: {
      content: {
        appellations: {
          originOfExonyms: "The term Ashanti is an anglophone variant.",
        },
        origins: { ancientOrigins: "The Asante belong to the Akan group." },
      },
    },
    translationKind: "machine",
    translatedAt: "2026-09-05T10:00:00.000Z",
    sourceHash: sourceHash(authored, classify),
    fieldHashes: fieldHashes(authored, classify),
    reviewRequired: ["content.appellations.originOfExonyms"],
    ...overrides,
  };
}

describe("withTranslation (REQ-142)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-142
  it("returns the authored record by reference and no provenance for the authored locale", async () => {
    const authored = authoredAsante();

    const result = await withTranslation(
      "people",
      "PPL_ASANTE",
      "fr",
      authored
    );

    expect(result.record).toBe(authored);
    expect(result.translation).toBeNull();
    expect(getAfrikTranslation).not.toHaveBeenCalled();
  });

  // @req REQ-142
  it("returns the authored record unchanged when no record exists for the locale (AC5)", async () => {
    vi.mocked(getAfrikTranslation).mockResolvedValue(null);
    const authored = authoredAsante();

    const result = await withTranslation(
      "people",
      "PPL_ASANTE",
      "en",
      authored
    );

    expect(result.record).toBe(authored);
    expect(result.translation).toBeNull();
  });

  // @req REQ-142
  it("overlays a machine record and reports its provenance (AC1)", async () => {
    vi.mocked(getAfrikTranslation).mockResolvedValue(englishRecord());

    const result = await withTranslation(
      "people",
      "PPL_ASANTE",
      "en",
      authoredAsante()
    );

    expect(getAfrikTranslation).toHaveBeenCalledWith(
      "people",
      "PPL_ASANTE",
      "en"
    );
    expect(result.record.content.origins.ancientOrigins).toBe(
      "The Asante belong to the Akan group."
    );
    // Class 3 stays French on machine provenance (REQ-143).
    expect(result.record.content.appellations.originOfExonyms).toBe(
      "Le terme Ashanti est une variante anglophone."
    );
    expect(result.translation).toEqual({
      kind: "machine",
      translatedAt: "2026-09-05T10:00:00.000Z",
      reviewedBy: null,
      stale: false,
    });
  });

  // @req REQ-142
  it("keeps confidence-bearing fields byte-identical (AC4 at the read path)", async () => {
    vi.mocked(getAfrikTranslation).mockResolvedValue(englishRecord());
    const authored = authoredAsante();

    const result = await withTranslation(
      "people",
      "PPL_ASANTE",
      "en",
      authored
    );

    expect(result.record.content.sources).toEqual(authored.content.sources);
    expect(result.record.nameMain).toBe(authored.nameMain);
  });

  // @req REQ-142
  it("names a reviewer and reports the reviewed standing (AC2)", async () => {
    vi.mocked(getAfrikTranslation).mockResolvedValue(
      englishRecord({ translationKind: "machine_reviewed", reviewedBy: "jnk" })
    );

    const result = await withTranslation(
      "people",
      "PPL_ASANTE",
      "en",
      authoredAsante()
    );

    expect(result.translation).toMatchObject({
      kind: "machine_reviewed",
      reviewedBy: "jnk",
    });
    expect(result.record.content.appellations.originOfExonyms).toBe(
      "The term Ashanti is an anglophone variant."
    );
  });

  // @req REQ-142
  it("flags the translation stale when the French moved on a leaf the reader is shown", async () => {
    vi.mocked(getAfrikTranslation).mockResolvedValue(englishRecord());
    const edited = authoredAsante();
    edited.content.origins.ancientOrigins = "Texte révisé après traduction.";

    const result = await withTranslation("people", "PPL_ASANTE", "en", edited);

    expect(result.translation?.stale).toBe(true);
  });

  // @req REQ-142
  it("serves the authored record when the read fails, so a missing table never breaks a fiche", async () => {
    vi.mocked(getAfrikTranslation).mockRejectedValue(
      new Error('relation "afrik_translations" does not exist')
    );
    const authored = authoredAsante();

    const result = await withTranslation(
      "people",
      "PPL_ASANTE",
      "en",
      authored
    );

    expect(result.record).toBe(authored);
    expect(result.translation).toBeNull();
    expect(logger.error).toHaveBeenCalledTimes(1);
  });
});

describe("attachTranslation (REQ-142)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-142
  it("hands the authored entity back untouched for the authored locale", async () => {
    const authored = authoredAsante();

    expect(
      await attachTranslation("people", "PPL_ASANTE", "fr", authored)
    ).toBe(authored);
    expect(await attachTranslation("people", "PPL_ASANTE", "en", null)).toBe(
      null
    );
  });

  // @req REQ-142
  it("carries the provenance on the entity for a translated locale, null when untranslated", async () => {
    vi.mocked(getAfrikTranslation).mockResolvedValue(englishRecord());

    const translated = await attachTranslation(
      "people",
      "PPL_ASANTE",
      "en",
      authoredAsante()
    );
    expect(translated?.translation).toMatchObject({ kind: "machine" });

    vi.mocked(getAfrikTranslation).mockResolvedValue(null);
    const untranslated = await attachTranslation(
      "people",
      "PPL_ASANTE",
      "en",
      authoredAsante()
    );
    expect(untranslated?.translation).toBeNull();
  });
});
