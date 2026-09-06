import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../server", () => ({
  createServerClient: vi.fn(),
}));

vi.mock("@/lib/api/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { logger } from "@/lib/api/logger";
import { createServerClient } from "../../../server";
import {
  TRANSLATION_ID_PAGE_SIZE,
  getAfrikTranslation,
  getAfrikTranslationIds,
} from "../translations";

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
      order: vi.fn(() => mockSupabase),
      single: vi.fn(),
      range: vi.fn(),
    };
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (createServerClient as any).mockReturnValue(mockSupabase);
  });

  // The sitemap reads record presence in batches rather than opening one
  // database request per corpus fiche.
  // @req REQ-141
  // @req REQ-142
  it("pages through translation ids for one entity type and locale", async () => {
    const firstPage = Array.from(
      { length: TRANSLATION_ID_PAGE_SIZE },
      (_, index) => ({ entity_id: `PPL_${index}` })
    );
    mockSupabase.range
      .mockResolvedValueOnce({ data: firstPage, error: null })
      .mockResolvedValueOnce({
        data: [{ entity_id: "PPL_LAST" }],
        error: null,
      });

    const ids = await getAfrikTranslationIds("people", "en");

    expect(mockSupabase.select).toHaveBeenCalledWith("entity_id");
    expect(mockSupabase.eq).toHaveBeenCalledWith("entity_type", "people");
    expect(mockSupabase.eq).toHaveBeenCalledWith("lang", "en");
    expect(mockSupabase.order).toHaveBeenCalledWith("entity_id");
    expect(mockSupabase.range).toHaveBeenNthCalledWith(
      1,
      0,
      TRANSLATION_ID_PAGE_SIZE - 1
    );
    expect(mockSupabase.range).toHaveBeenNthCalledWith(
      2,
      TRANSLATION_ID_PAGE_SIZE,
      TRANSLATION_ID_PAGE_SIZE * 2 - 1
    );
    expect(ids).toHaveLength(TRANSLATION_ID_PAGE_SIZE + 1);
    expect(ids.at(-1)).toBe("PPL_LAST");
  });

  // @req REQ-141
  it("fails the batch read closed when the translation store cannot be read", async () => {
    const failure = { code: "42P01", message: "missing translation table" };
    mockSupabase.range.mockResolvedValue({ data: null, error: failure });

    await expect(getAfrikTranslationIds("country", "en")).rejects.toBe(failure);
    expect(logger.error).toHaveBeenCalledWith(
      "Error fetching AFRIK translation ids country/en",
      failure
    );
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
