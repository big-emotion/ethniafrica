import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/api/v2/services/languageService", () => ({
  getLanguageById: vi.fn(),
}));

import { getLanguageById } from "@/api/v2/services/languageService";
import { API_ATTRIBUTION, API_LICENSE } from "@/api/v2/utils/response";
import { getLanguageHandler } from "../languages";

const YORUBA = {
  id: "yor",
  name: "Yoruba",
  nameProvenance: "sourced" as const,
  isoCode639_3: "yor",
  glottocode: "yoru1245",
  nameEn: "Yoruba",
  alternateNames: [] as string[],
  spellingAliases: [] as string[],
  dialects: [] as string[],
  family: { id: "FLG_BENOUECONGO", name: "Bénoué-Congo" },
  speakingPeoples: [
    { id: "PPL_YORUBA", name: "Yoruba" },
    { id: "PPL_ANAGO", name: "Anago" },
  ],
  vehicularRole: "Langue véhiculaire régionale",
  vitalityStatus: {
    status: "Institutional",
    scale: "EGIDS",
    asOf: 2025,
  },
  sources: [
    {
      id: "SRC_GLOTTOLOG_YORUBA",
      title: "Glottolog 5.3 — Yoruba",
      url: "https://glottolog.org/resource/languoid/id/yoru1245",
      tier: "official" as const,
      notes: "Direct linguistic reference.",
    },
  ],
};

describe("Language Handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-136
  it("serializes and validates a known language in the licensed envelope", async () => {
    vi.mocked(getLanguageById).mockResolvedValue(YORUBA);

    const result = await getLanguageHandler("yor");

    expect(getLanguageById).toHaveBeenCalledWith("yor");
    expect(result).toEqual({
      ok: true,
      envelope: {
        data: {
          ...YORUBA,
          speakingPeoples: [
            { id: "PPL_ANAGO", name: "Anago" },
            { id: "PPL_YORUBA", name: "Yoruba" },
          ],
        },
        meta: {
          license: API_LICENSE,
          attribution: API_ATTRIBUTION,
        },
        errors: [],
      },
    });
  });

  // @req REQ-136
  it("returns NOT_FOUND without constructing an envelope for an unknown language", async () => {
    vi.mocked(getLanguageById).mockResolvedValue(null);

    const result = await getLanguageHandler("zzz");

    expect(result).toEqual({
      ok: false,
      code: "NOT_FOUND",
      message: "Language not found: zzz",
    });
    expect(result).not.toHaveProperty("envelope");
  });

  // @req REQ-136
  it("lets unexpected service errors propagate to the route", async () => {
    const error = new Error("Supabase unavailable");
    vi.mocked(getLanguageById).mockRejectedValue(error);

    await expect(getLanguageHandler("yor")).rejects.toBe(error);
  });

  // @req REQ-136
  it("lets schema validation errors propagate to the route", async () => {
    vi.mocked(getLanguageById).mockResolvedValue({
      ...YORUBA,
      name: "",
    });

    await expect(getLanguageHandler("yor")).rejects.toMatchObject({
      name: "ZodError",
    });
  });
});
