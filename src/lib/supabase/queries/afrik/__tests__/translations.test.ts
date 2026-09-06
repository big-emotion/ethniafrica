import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../server", () => ({
  createServerClient: vi.fn(),
}));

vi.mock("@/lib/api/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { logger } from "@/lib/api/logger";
import { createServerClient } from "../../../server";
import { getAfrikTranslation } from "../translations";

const ROW = {
  entity_type: "people",
  entity_id: "PPL_ASANTE",
  lang: "en",
  content: { content: { origins: { ancientOrigins: "The Asante…" } } },
  translation_kind: "machine",
  translated_at: "2026-09-05T10:00:00.000Z",
  reviewed_by: null,
  model: "claude-sonnet-4-5",
  source_hash: "a".repeat(64),
  field_hashes: { "content.origins.ancientOrigins": "0123456789abcdef" },
  review_required: ["content.appellations.originOfExonyms"],
  updated_at: "2026-09-05T10:00:00.000Z",
};

describe("getAfrikTranslation (REQ-142)", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn(() => mockSupabase),
      select: vi.fn(() => mockSupabase),
      eq: vi.fn(() => mockSupabase),
      single: vi.fn(),
    };
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (createServerClient as any).mockReturnValue(mockSupabase);
  });

  // @req REQ-142
  it("filters on the primary key triple and maps the row to the record", async () => {
    mockSupabase.single.mockResolvedValue({ data: ROW, error: null });

    const record = await getAfrikTranslation("people", "PPL_ASANTE", "en");

    expect(mockSupabase.from).toHaveBeenCalledWith("afrik_translations");
    expect(mockSupabase.eq).toHaveBeenCalledWith("entity_type", "people");
    expect(mockSupabase.eq).toHaveBeenCalledWith("entity_id", "PPL_ASANTE");
    expect(mockSupabase.eq).toHaveBeenCalledWith("lang", "en");
    expect(record).toEqual({
      entityType: "people",
      entityId: "PPL_ASANTE",
      lang: "en",
      content: ROW.content,
      translationKind: "machine",
      translatedAt: "2026-09-05T10:00:00.000Z",
      reviewedBy: undefined,
      model: "claude-sonnet-4-5",
      sourceHash: "a".repeat(64),
      fieldHashes: ROW.field_hashes,
      reviewRequired: ROW.review_required,
    });
  });

  // @req REQ-142
  it("returns null when no record exists for the locale (AC5)", async () => {
    mockSupabase.single.mockResolvedValue({
      data: null,
      error: { code: "PGRST116", message: "no rows" },
    });

    expect(await getAfrikTranslation("people", "PPL_ASANTE", "en")).toBeNull();
    expect(logger.error).not.toHaveBeenCalled();
  });

  // @req REQ-142
  it("logs and rethrows any other read failure, such as a table not yet migrated", async () => {
    const failure = {
      code: "42P01",
      message: 'relation "afrik_translations" does not exist',
    };
    mockSupabase.single.mockResolvedValue({ data: null, error: failure });

    await expect(
      getAfrikTranslation("people", "PPL_ASANTE", "en")
    ).rejects.toBe(failure);
    expect(logger.error).toHaveBeenCalledTimes(1);
  });
});
