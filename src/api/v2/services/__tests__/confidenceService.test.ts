import { describe, it, expect, vi, beforeEach } from "vitest";

const fromMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => ({ from: fromMock }),
}));

import { getConfidenceFor } from "../confidence";

type FakeQuery = Record<string, ReturnType<typeof vi.fn>>;

function buildSingleQuery(row: Record<string, unknown> | null): FakeQuery {
  const query: FakeQuery = {} as FakeQuery;
  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.maybeSingle = vi.fn(() => Promise.resolve({ data: row, error: null }));
  return query;
}

describe("confidence service", () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  it("queries confidence_scores with the internal entity_type", async () => {
    const row = {
      entity_type: "language_family",
      entity_id: "FLG_BANTU",
      score: 73,
      source_count: 4,
      avg_source_quality: 0.81,
      last_human_audit_at: "2026-03-12T00:00:00.000Z",
      open_flag_count: 0,
      recomputed_at: "2026-05-01T00:00:00.000Z",
    };
    const query = buildSingleQuery(row);
    fromMock.mockReturnValue(query);

    const result = await getConfidenceFor("language-family", "FLG_BANTU");

    expect(fromMock).toHaveBeenCalledWith("confidence_scores");
    expect(query.eq).toHaveBeenCalledWith("entity_type", "language_family");
    expect(query.eq).toHaveBeenCalledWith("entity_id", "FLG_BANTU");
    expect(result).toEqual({
      entityType: "language-family",
      entityId: "FLG_BANTU",
      score: 73,
      sourceCount: 4,
      avgSourceQuality: 0.81,
      lastHumanAuditAt: "2026-03-12T00:00:00.000Z",
      openFlagCount: 0,
      recomputedAt: "2026-05-01T00:00:00.000Z",
    });
  });

  it("maps people entityType to internal 'people'", async () => {
    const query = buildSingleQuery({
      entity_type: "people",
      entity_id: "PPL_SHONA",
      score: 50,
      source_count: 2,
      avg_source_quality: 0.5,
      last_human_audit_at: null,
      open_flag_count: 1,
      recomputed_at: null,
    });
    fromMock.mockReturnValue(query);

    await getConfidenceFor("people", "PPL_SHONA");

    expect(query.eq).toHaveBeenCalledWith("entity_type", "people");
    expect(query.eq).toHaveBeenCalledWith("entity_id", "PPL_SHONA");
  });

  it("returns null when no confidence row exists", async () => {
    const query = buildSingleQuery(null);
    fromMock.mockReturnValue(query);

    const result = await getConfidenceFor("people", "PPL_UNKNOWN");

    expect(result).toBeNull();
  });

  it("normalises missing pre-014 columns to safe defaults", async () => {
    const row = {
      entity_type: "people",
      entity_id: "PPL_SHONA",
      score: null,
    };
    const query = buildSingleQuery(row);
    fromMock.mockReturnValue(query);

    const result = await getConfidenceFor("people", "PPL_SHONA");

    expect(result).toMatchObject({
      score: null,
      sourceCount: 0,
      avgSourceQuality: null,
      lastHumanAuditAt: null,
      openFlagCount: 0,
      recomputedAt: null,
    });
  });

  it("throws on supabase errors", async () => {
    const query: FakeQuery = {} as FakeQuery;
    query.select = vi.fn(() => query);
    query.eq = vi.fn(() => query);
    query.maybeSingle = vi.fn(() =>
      Promise.resolve({ data: null, error: { message: "db down" } })
    );
    fromMock.mockReturnValue(query);

    await expect(getConfidenceFor("people", "PPL_SHONA")).rejects.toThrow(
      /db down/
    );
  });
});
