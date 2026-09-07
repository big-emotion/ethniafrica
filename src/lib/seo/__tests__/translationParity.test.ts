import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAfrikTranslationMock, getAfrikTranslationIdsMock } = vi.hoisted(
  () => ({
    getAfrikTranslationMock: vi.fn(),
    getAfrikTranslationIdsMock: vi.fn(),
  })
);

vi.mock("@/lib/supabase/queries/afrik/translations", () => ({
  getAfrikTranslation: (...args: unknown[]) => getAfrikTranslationMock(...args),
  getAfrikTranslationIds: (...args: unknown[]) =>
    getAfrikTranslationIdsMock(...args),
}));

import {
  ficheHasTranslation,
  ficheIdsWithTranslation,
} from "@/lib/seo/translationParity";

describe("ficheHasTranslation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAfrikTranslationMock.mockResolvedValue(null);
    getAfrikTranslationIdsMock.mockResolvedValue([]);
  });

  // @req REQ-141
  // @req REQ-142
  it("filters a fiche set with one translation-store read", async () => {
    getAfrikTranslationIdsMock.mockResolvedValue(["PPL_B", "PPL_C"]);

    await expect(
      ficheIdsWithTranslation("people", ["PPL_A", "PPL_B"], "en")
    ).resolves.toEqual(["PPL_B"]);
    expect(getAfrikTranslationIdsMock).toHaveBeenCalledTimes(1);
    expect(getAfrikTranslationIdsMock).toHaveBeenCalledWith("people", "en");
  });

  // A broken parity read may withhold English, never French.
  // @req REQ-141
  it("keeps the authored ids without reading the translation store", async () => {
    await expect(
      ficheIdsWithTranslation("family", ["FLG_A"], "fr")
    ).resolves.toEqual(["FLG_A"]);
    expect(getAfrikTranslationIdsMock).not.toHaveBeenCalled();
  });

  // @req REQ-141
  it("answers yes for the authored French corpus without querying the store", async () => {
    expect(await ficheHasTranslation("people", "PPL_YORUBA", "fr")).toBe(true);
    expect(getAfrikTranslationMock).not.toHaveBeenCalled();
  });

  // ETNI-1826 has landed: record presence is now the parity signal used by
  // canonical metadata and the bilingual sitemap.
  // @req REQ-141
  // @req REQ-142
  it("answers yes for English when its translation record exists", async () => {
    getAfrikTranslationMock.mockResolvedValue({ entityId: "PPL_YORUBA" });

    expect(await ficheHasTranslation("people", "PPL_YORUBA", "en")).toBe(true);
    expect(getAfrikTranslationMock).toHaveBeenCalledWith(
      "people",
      "PPL_YORUBA",
      "en"
    );
  });

  // @req REQ-141
  it("answers no when no English translation record exists", async () => {
    expect(await ficheHasTranslation("country", "BEN", "en")).toBe(false);
  });

  // Fiche route names and translation-store entity names are deliberately
  // different for families and patronymes; the mapping must stay explicit.
  // @req REQ-141
  // @req REQ-142
  it.each([
    ["family", "language_family"],
    ["name", "patronyme"],
    ["language", "language"],
    ["country", "country"],
  ] as const)("maps %s fiches to %s records", async (kind, entityType) => {
    await ficheHasTranslation(kind, "ID", "en");

    expect(getAfrikTranslationMock).toHaveBeenCalledWith(
      entityType,
      "ID",
      "en"
    );
  });
});
