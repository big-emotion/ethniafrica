import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

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
import { API_ATTRIBUTION, API_LICENSE } from "@/api/v2/utils/response";
import { GET } from "../languages/[id]/route";

describe("Language public API contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAfrikSpeakingPeoples).mockResolvedValue([]);
    vi.mocked(getSourcesMap).mockResolvedValue(new Map());
  });

  // @req REQ-136
  it("preserves 40 speaking peoples and nullable claims through the public boundary", async () => {
    const speakingPeoples = Array.from({ length: 40 }, (_, index) => ({
      id: `PPL_${String(index + 1).padStart(2, "0")}`,
      name: `People ${String(40 - index).padStart(2, "0")}`,
    }));

    vi.mocked(getAfrikLanguageById).mockResolvedValue({
      id: "swa",
      name: "Swahili",
      family: { id: "FLG_BANTU", name: "Bantou" },
      content: { nameProvenance: "derived" },
    });
    vi.mocked(getAfrikSpeakingPeoples).mockResolvedValue(speakingPeoples);

    const response = await GET(
      new NextRequest("http://localhost/api/v2/languages/swa"),
      { params: Promise.resolve({ id: "swa" }) }
    );
    const envelope = await response.json();

    expect(response.status).toBe(200);
    expect(envelope).toMatchObject({
      data: {
        id: "swa",
        name: "Swahili",
        nameProvenance: "derived",
        family: { id: "FLG_BANTU", name: "Bantou" },
        vehicularRole: null,
        vitalityStatus: null,
        sources: [],
      },
      meta: {
        license: API_LICENSE,
        attribution: API_ATTRIBUTION,
      },
      errors: [],
    });
    expect(envelope.data.speakingPeoples).toHaveLength(40);
    expect(envelope.data.speakingPeoples).toEqual(
      [...speakingPeoples].sort(
        (left, right) =>
          left.name.localeCompare(right.name, "fr") ||
          left.id.localeCompare(right.id, "en")
      )
    );
    expect(getAfrikLanguageById).toHaveBeenCalledOnce();
    expect(getAfrikSpeakingPeoples).toHaveBeenCalledOnce();
    expect(getAfrikSpeakingPeoples).toHaveBeenCalledWith("swa");
    expect(getSourcesMap).toHaveBeenCalledOnce();
    expect(getSourcesMap).toHaveBeenCalledWith(["swa"]);
  });

  // @req REQ-136
  it("preserves sourced-name provenance, vitality, and normalized source tiers", async () => {
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
    ]);
    vi.mocked(getSourcesMap).mockResolvedValue(
      new Map([
        [
          "yor",
          [
            {
              id: "SRC_GLOTTOLOG_YORUBA",
              title: "Glottolog — Yoruba",
              url: "https://glottolog.org/resource/languoid/id/yoru1245",
              tier: "official",
            },
            {
              id: "SRC_LEGACY_YORUBA",
              title: "Legacy catalogue",
              url: null,
              tier: null,
            },
          ],
        ],
      ])
    );

    const response = await GET(
      new NextRequest("http://localhost/api/v2/languages/yor"),
      { params: Promise.resolve({ id: "yor" }) }
    );
    const envelope = await response.json();

    expect(response.status).toBe(200);
    expect(envelope.data).toEqual({
      id: "yor",
      name: "Yoruba",
      nameProvenance: "sourced",
      family: { id: "FLG_BENOUECONGO", name: "Bénoué-Congo" },
      speakingPeoples: [{ id: "PPL_YORUBA", name: "Yoruba" }],
      vehicularRole: "regional_lingua_franca",
      vitalityStatus: {
        status: "Institutional",
        scale: "EGIDS",
        asOf: 2025,
      },
      sources: [
        {
          id: "SRC_GLOTTOLOG_YORUBA",
          title: "Glottolog — Yoruba",
          url: "https://glottolog.org/resource/languoid/id/yoru1245",
          tier: "official",
          notes: null,
        },
        {
          id: "SRC_LEGACY_YORUBA",
          title: "Legacy catalogue",
          url: null,
          tier: "unverified",
          notes: null,
        },
      ],
    });
    expect(envelope.meta).toEqual({
      license: API_LICENSE,
      attribution: API_ATTRIBUTION,
    });
    expect(envelope.errors).toEqual([]);
  });
});
