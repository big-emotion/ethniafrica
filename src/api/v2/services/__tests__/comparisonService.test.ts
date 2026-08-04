import { describe, it, expect, vi, beforeEach } from "vitest";

const fromMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => ({ from: fromMock }),
}));

vi.mock("@/lib/api/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

const getConfidenceMapMock = vi.fn();

vi.mock("@/lib/supabase/queries/afrik/module-zero-batch", () => ({
  getConfidenceMap: (...args: unknown[]) => getConfidenceMapMock(...args),
}));

import { getComparisonEntities } from "../comparisonService";
import { logger } from "@/lib/api/logger";

type FakeQuery = Record<string, ReturnType<typeof vi.fn>>;

function buildInQuery(result: {
  data: Array<Record<string, unknown>> | null;
  error: { message: string } | null;
}): FakeQuery {
  const query: FakeQuery = {} as FakeQuery;
  query.select = vi.fn(() => query);
  query.in = vi.fn(() => Promise.resolve(result));
  return query;
}

describe("comparisonService", () => {
  beforeEach(() => {
    fromMock.mockReset();
    getConfidenceMapMock.mockReset();
    getConfidenceMapMock.mockResolvedValue(new Map());
    vi.mocked(logger.error).mockReset();
  });

  // @req REQ-097
  it("performs exactly one batched entity read and one batched confidence read (peuple)", async () => {
    const query = buildInQuery({
      data: [
        {
          id: "PPL_A",
          name_main: "People A",
          content: { appellations: { autoAppellation: "A" } },
        },
        {
          id: "PPL_B",
          name_main: "People B",
          content: { appellations: { autoAppellation: "B" } },
        },
      ],
      error: null,
    });
    fromMock.mockReturnValue(query);
    getConfidenceMapMock.mockResolvedValue(
      new Map([["PPL_A", { entityId: "PPL_A", score: 80 }]])
    );

    const result = await getComparisonEntities("peuple", ["PPL_A", "PPL_B"]);

    expect(fromMock).toHaveBeenCalledTimes(1);
    expect(fromMock).toHaveBeenCalledWith("afrik_peoples");
    expect(query.in).toHaveBeenCalledWith("id", ["PPL_A", "PPL_B"]);
    expect(getConfidenceMapMock).toHaveBeenCalledTimes(1);
    expect(getConfidenceMapMock).toHaveBeenCalledWith(
      ["PPL_A", "PPL_B"],
      "people"
    );

    expect(result.missingIds).toEqual([]);
    expect(result.entities).toHaveLength(2);
    expect(result.entities[0]).toEqual({
      id: "PPL_A",
      entity: {
        type: "peuple",
        id: "PPL_A",
        label: "People A",
        appellations: { autoAppellation: "A" },
      },
      confidence: { entityId: "PPL_A", score: 80 },
    });
    expect(result.entities[1].confidence).toBeNull();
  });

  // @req REQ-097
  it("queries afrik_countries with entity_type 'country' for pays comparisons", async () => {
    const query = buildInQuery({
      data: [
        { id: "COM", name_fr: "Comores", content: {} },
        { id: "ZAF", name_fr: "Afrique du Sud", content: {} },
      ],
      error: null,
    });
    fromMock.mockReturnValue(query);

    await getComparisonEntities("pays", ["COM", "ZAF"]);

    expect(fromMock).toHaveBeenCalledWith("afrik_countries");
    expect(getConfidenceMapMock).toHaveBeenCalledWith(
      ["COM", "ZAF"],
      "country"
    );
  });

  // @req REQ-097
  it("queries afrik_language_families with entity_type 'language_family' for famille comparisons", async () => {
    const query = buildInQuery({
      data: [
        { id: "FLG_BANTU", name_fr: "Bantou", content: {} },
        { id: "FLG_CHADIC", name_fr: "Tchadique", content: {} },
      ],
      error: null,
    });
    fromMock.mockReturnValue(query);

    await getComparisonEntities("famille", ["FLG_BANTU", "FLG_CHADIC"]);

    expect(fromMock).toHaveBeenCalledWith("afrik_language_families");
    expect(getConfidenceMapMock).toHaveBeenCalledWith(
      ["FLG_BANTU", "FLG_CHADIC"],
      "language_family"
    );
  });

  // @req REQ-097
  it("identifies a missing id instead of silently dropping it", async () => {
    const query = buildInQuery({
      data: [{ id: "PPL_A", name_main: "People A", content: {} }],
      error: null,
    });
    fromMock.mockReturnValue(query);

    const result = await getComparisonEntities("peuple", ["PPL_A", "PPL_X"]);

    expect(result.missingIds).toEqual(["PPL_X"]);
    expect(result.entities.map((e) => e.id)).toEqual(["PPL_A"]);
    expect(getConfidenceMapMock).toHaveBeenCalledWith(["PPL_A"], "people");
  });

  // @req REQ-097
  it("sets confidence to null when no confidence_scores row exists (never a default score)", async () => {
    const query = buildInQuery({
      data: [{ id: "PPL_A", name_main: "People A", content: {} }],
      error: null,
    });
    fromMock.mockReturnValue(query);
    getConfidenceMapMock.mockResolvedValue(new Map());

    const result = await getComparisonEntities("peuple", ["PPL_A"]);

    expect(result.entities[0].confidence).toBeNull();
  });

  // @req REQ-097
  it("returns an empty result without querying when ids is empty", async () => {
    const result = await getComparisonEntities("peuple", []);

    expect(result).toEqual({ entities: [], missingIds: [] });
    expect(fromMock).not.toHaveBeenCalled();
    expect(getConfidenceMapMock).not.toHaveBeenCalled();
  });

  // @req REQ-097
  it("logs via @/lib/api/logger and treats all ids as missing on entity query error", async () => {
    const query = buildInQuery({
      data: null,
      error: { message: "boom" },
    });
    fromMock.mockReturnValue(query);

    const result = await getComparisonEntities("peuple", ["PPL_A", "PPL_B"]);

    expect(result.entities).toEqual([]);
    expect(result.missingIds).toEqual(["PPL_A", "PPL_B"]);
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(getConfidenceMapMock).not.toHaveBeenCalled();
  });
});
