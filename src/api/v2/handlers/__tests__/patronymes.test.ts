import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/api/v2/services/patronymes", () => ({
  getPatronymeById: vi.fn(),
}));

import { getPatronymeById } from "@/api/v2/services/patronymes";
import { API_ATTRIBUTION, API_LICENSE } from "@/api/v2/utils/response";
import { getPatronymeHandler } from "../patronymes";

const KEITA = {
  id: "PAT_KEITA",
  nameMain: "Keita",
  nameSystem: "clan_name" as const,
  casteOrSocialFunction: "horon",
  content: { nameMain: "Keita", transmissionMode: "patrilineal" },
  associatedPeoples: [
    { id: "PPL_B", nameMain: "Bambara", autonym: null, slug: "PPL_B" },
    { id: "PPL_A", nameMain: "Alladian", autonym: null, slug: "PPL_A" },
  ],
  associatedCountries: [
    { id: "SEN", nameFr: "Sénégal" },
    { id: "MLI", nameFr: "Mali" },
  ],
  bearers: [
    { id: "PER_B", fullName: "Bearer", roleCategory: "author" },
    { id: "PER_A", fullName: "Aearer", roleCategory: "author" },
  ],
};

describe("Patronyme Handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-133
  it("serializes and validates a known patronyme in the licensed envelope", async () => {
    vi.mocked(getPatronymeById).mockResolvedValue(KEITA);

    const result = await getPatronymeHandler("PAT_KEITA");

    expect(getPatronymeById).toHaveBeenCalledWith("PAT_KEITA");
    expect(result).toEqual({
      ok: true,
      envelope: {
        data: {
          ...KEITA,
          associatedPeoples: [
            { id: "PPL_A", nameMain: "Alladian", autonym: null, slug: "PPL_A" },
            { id: "PPL_B", nameMain: "Bambara", autonym: null, slug: "PPL_B" },
          ],
          associatedCountries: [
            { id: "MLI", nameFr: "Mali" },
            { id: "SEN", nameFr: "Sénégal" },
          ],
          bearers: [
            { id: "PER_A", fullName: "Aearer", roleCategory: "author" },
            { id: "PER_B", fullName: "Bearer", roleCategory: "author" },
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

  // @req REQ-133
  it("returns NOT_FOUND without constructing an envelope for an unknown patronyme", async () => {
    vi.mocked(getPatronymeById).mockResolvedValue(null);

    const result = await getPatronymeHandler("PAT_UNKNOWN");

    expect(result).toEqual({
      ok: false,
      code: "NOT_FOUND",
      message: "Patronyme not found: PAT_UNKNOWN",
    });
    expect(result).not.toHaveProperty("envelope");
  });

  // @req REQ-133
  it("lets unexpected service errors propagate to the route", async () => {
    const error = new Error("Supabase unavailable");
    vi.mocked(getPatronymeById).mockRejectedValue(error);

    await expect(getPatronymeHandler("PAT_KEITA")).rejects.toBe(error);
  });
});
