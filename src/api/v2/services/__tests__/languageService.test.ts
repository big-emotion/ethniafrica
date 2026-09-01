import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/queries/afrik/languages", () => ({
  getAfrikLanguageById: vi.fn(),
  getAfrikSpeakingPeoples: vi.fn(),
}));

vi.mock("@/lib/supabase/queries/afrik/module-zero-batch", () => ({
  getSourcesMap: vi.fn(),
}));

import {
  getAfrikLanguageById,
  getAfrikSpeakingPeoples,
} from "@/lib/supabase/queries/afrik/languages";
import { getSourcesMap } from "@/lib/supabase/queries/afrik/module-zero-batch";
import { getLanguageById } from "../languageService";

describe("Language Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAfrikSpeakingPeoples).mockResolvedValue([]);
    vi.mocked(getSourcesMap).mockResolvedValue(new Map());
  });

  // @req REQ-136
  it("assembles a language detail from canonical relations and normalized sources", async () => {
    vi.mocked(getAfrikLanguageById).mockResolvedValue({
      id: "yor",
      name: "Yoruba",
      family: { id: "FLG_BENOUECONGO", name: "Bénoué-Congo" },
      content: {
        nameProvenance: "sourced",
        vehicularRole: "regional_lingua_franca",
        vitalityStatus: {
          status: "Institutional",
          scale: "EGIDS",
          asOf: 2025,
        },
      },
    });
    vi.mocked(getAfrikSpeakingPeoples).mockResolvedValue([
      { id: "PPL_YORUBA", name: "Yoruba" },
      { id: "PPL_NAGO", name: "Nago" },
    ]);
    vi.mocked(getSourcesMap).mockResolvedValue(
      new Map([
        [
          "yor",
          [
            {
              id: "src-1",
              title: "Glottolog",
              url: "https://glottolog.org/resource/languoid/id/yoru1245",
              tier: "official",
            },
            {
              id: "src-legacy",
              title: "Legacy catalogue",
              url: null,
              tier: null,
            },
          ],
        ],
      ])
    );

    const result = await getLanguageById("yor");

    expect(getAfrikSpeakingPeoples).toHaveBeenCalledWith("yor");
    expect(getSourcesMap).toHaveBeenCalledWith(["yor"]);
    expect(result).toEqual({
      id: "yor",
      name: "Yoruba",
      nameProvenance: "sourced",
      family: { id: "FLG_BENOUECONGO", name: "Bénoué-Congo" },
      speakingPeoples: [
        { id: "PPL_YORUBA", name: "Yoruba" },
        { id: "PPL_NAGO", name: "Nago" },
      ],
      vehicularRole: "regional_lingua_franca",
      vitalityStatus: {
        status: "Institutional",
        scale: "EGIDS",
        asOf: 2025,
      },
      sources: [
        {
          id: "src-1",
          title: "Glottolog",
          url: "https://glottolog.org/resource/languoid/id/yoru1245",
          tier: "official",
          notes: null,
        },
        {
          id: "src-legacy",
          title: "Legacy catalogue",
          url: null,
          tier: "unverified",
          notes: null,
        },
      ],
    });
  });

  // @req REQ-136
  it("returns null without querying relations or sources for an unknown id", async () => {
    vi.mocked(getAfrikLanguageById).mockResolvedValue(null);

    const result = await getLanguageById("zzz");

    expect(result).toBeNull();
    expect(getAfrikSpeakingPeoples).not.toHaveBeenCalled();
    expect(getSourcesMap).not.toHaveBeenCalled();
  });

  // @req REQ-136
  it("defaults derived provenance and optional content fields without inventing claims", async () => {
    vi.mocked(getAfrikLanguageById).mockResolvedValue({
      id: "nyn",
      name: "Nyankore",
      family: { id: "FLG_BANTU", name: "Bantou" },
      content: {},
    });

    const result = await getLanguageById("nyn");

    expect(result).toMatchObject({
      nameProvenance: "derived",
      vehicularRole: null,
      vitalityStatus: null,
      sources: [],
    });
  });

  // @req REQ-136
  it("treats malformed optional content as absent", async () => {
    vi.mocked(getAfrikLanguageById).mockResolvedValue({
      id: "nyn",
      name: "Nyankore",
      family: { id: "FLG_BANTU", name: "Bantou" },
      content: {
        nameProvenance: "unknown",
        vehicularRole: 42,
        vitalityStatus: { status: "Developing", scale: "EGIDS" },
      },
    });

    const result = await getLanguageById("nyn");

    expect(result).toMatchObject({
      nameProvenance: "derived",
      vehicularRole: null,
      vitalityStatus: null,
    });
  });
});
