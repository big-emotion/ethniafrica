import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../server", () => ({ createServerClient: vi.fn() }));

vi.mock("@/lib/api/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { getFieldNotes } from "../module-zero-batch";
import { createServerClient } from "../../../server";
import { logger } from "@/lib/api/logger";

type Result = { data: unknown[] | null; error: { message: string } | null };

/**
 * A double that resolves wherever the call chain ends, since the two queries
 * here terminate on different operators — the assertions read on `is`, the
 * sources read on `in`.
 */
function mockSupabase(results: Result[]) {
  const queue = [...results];
  const fromSpy = vi.fn();
  const calls: Record<string, unknown[][]> = {};

  const record = (name: string) =>
    vi.fn((...args: unknown[]) => {
      (calls[name] ??= []).push(args);
      return chain;
    });

  const terminal = (name: string) =>
    vi.fn((...args: unknown[]) => {
      (calls[name] ??= []).push(args);
      const next = queue.shift() ?? { data: [], error: null };
      return Object.assign(Promise.resolve(next), chain);
    });

  const chain: Record<string, unknown> = {
    select: record("select"),
    eq: record("eq"),
    is: terminal("is"),
    in: terminal("in"),
  };

  fromSpy.mockReturnValue(chain);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (createServerClient as any).mockReturnValue({ from: fromSpy });

  return { fromSpy, calls };
}

const ASSERTION = {
  id: "a-1",
  field_path: "content.culture.majorRites",
  statement: "Les rites d'initiation structurent les classes d'âge.",
  confidence_level: null,
  source_ids: ["s-1"],
};

const SOURCE = {
  id: "s-1",
  title: "Ethnologue",
  url: "https://ethnologue.com",
  tier: "official",
  notes: "Catalogue entry.",
  author: "SIL International",
  year: 2024,
};

describe("getFieldNotes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-007
  it("asks nothing of the database for an entity with no identifier", async () => {
    const { fromSpy } = mockSupabase([]);

    expect(await getFieldNotes("people", "")).toEqual([]);
    expect(fromSpy).not.toHaveBeenCalled();
  });

  /**
   * `source_ids` is a UUID[] with no foreign key, so PostgREST cannot embed
   * the sources — two round trips is the floor, and the point is that it stays
   * two however many fields the fiche carries.
   */
  // @req REQ-007
  it("resolves every field of a fiche in two queries", async () => {
    const { fromSpy } = mockSupabase([
      {
        data: [
          ASSERTION,
          { ...ASSERTION, id: "a-2", field_path: "content.culture.symbols" },
        ],
        error: null,
      },
      { data: [SOURCE], error: null },
    ]);

    const notes = await getFieldNotes("people", "PPL_YORUBA");

    expect(fromSpy).toHaveBeenCalledTimes(2);
    expect(notes).toHaveLength(2);
  });

  // @req REQ-007
  it("keys each note by the field the assertion is about", async () => {
    mockSupabase([
      { data: [ASSERTION], error: null },
      { data: [SOURCE], error: null },
    ]);

    const [note] = await getFieldNotes("people", "PPL_YORUBA");

    expect(note.fieldPath).toBe("content.culture.majorRites");
    expect(note.assertionId).toBe("a-1");
    expect(note.sources[0]).toMatchObject({
      id: "s-1",
      title: "Ethnologue",
      author: "SIL International",
      year: 2024,
    });
  });

  /**
   * A superseded assertion is one the corpus has moved past. Numbering it would
   * put a callout on the page for a claim the fiche no longer makes.
   */
  // @req REQ-007
  it("leaves superseded assertions out of the reading", async () => {
    const { calls } = mockSupabase([
      { data: [ASSERTION], error: null },
      { data: [SOURCE], error: null },
    ]);

    await getFieldNotes("people", "PPL_YORUBA");

    expect(calls.is).toContainEqual(["superseded_by", null]);
  });

  // @req REQ-007
  it("drops an assertion whose sources have all gone missing", async () => {
    mockSupabase([
      { data: [ASSERTION], error: null },
      { data: [], error: null },
    ]);

    expect(await getFieldNotes("people", "PPL_YORUBA")).toEqual([]);
  });

  /**
   * The fiche is the page; its bibliography is not. A failed lookup must cost
   * the callouts, never the fiche.
   */
  // @req REQ-007
  it("reports a failure and returns nothing, rather than throwing at the page", async () => {
    mockSupabase([{ data: null, error: { message: "boom" } }]);

    expect(await getFieldNotes("people", "PPL_YORUBA")).toEqual([]);
    expect(logger.error).toHaveBeenCalled();
  });
});
