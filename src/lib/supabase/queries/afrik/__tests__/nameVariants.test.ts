import { beforeEach, describe, expect, it, vi } from "vitest";

const { fromMock, loggerErrorMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  loggerErrorMock: vi.fn(),
}));

vi.mock("../../../server", () => ({
  createServerClient: () => ({ from: fromMock }),
}));

vi.mock("@/lib/api/logger", () => ({
  logger: {
    info: vi.fn(),
    error: loggerErrorMock,
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import {
  DeclaredNameVariantGapError,
  resolvePatronymeIdsBySpelling,
  resolveRequiredPatronymeIdsBySpelling,
} from "../nameVariants";

interface QueryResult {
  data: Array<{ entity_id: string }> | null;
  error: { message: string } | null;
}

function buildNameRecordsQuery(result: QueryResult) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    ilike: vi.fn(),
  };

  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.ilike.mockResolvedValue(result);

  return query;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("patronyme name-variant resolution", () => {
  // @req REQ-135
  it("queries only patronyme name_records for the exact trimmed spelling and deduplicates before joins", async () => {
    const query = buildNameRecordsQuery({
      data: [
        { entity_id: "PAT_DIALLO" },
        { entity_id: "PAT_DIALLO" },
        { entity_id: "PPL_NOT_A_PATRONYME" },
      ],
      error: null,
    });
    fromMock.mockImplementation((table: string) => {
      if (table !== "name_records") {
        throw new Error(`Unexpected pre-join query to ${table}`);
      }
      return query;
    });

    const result = await resolvePatronymeIdsBySpelling("  Diallo  ");

    expect(result).toEqual(["PAT_DIALLO"]);
    expect(fromMock).toHaveBeenCalledTimes(1);
    expect(fromMock).toHaveBeenCalledWith("name_records");
    expect(query.select).toHaveBeenCalledWith("entity_id");
    expect(query.eq).toHaveBeenCalledWith("entity_type", "patronyme");
    expect(query.ilike).toHaveBeenCalledWith("name_text", "Diallo");
  });

  // @req REQ-135
  it.each(["Diallo", "Jallow", "Jalloh"])(
    "resolves the declared %s spelling to the Diallo canonical patronyme",
    async (spelling) => {
      const query = buildNameRecordsQuery({
        data: [{ entity_id: "PAT_DIALLO" }, { entity_id: "PAT_DIALLO" }],
        error: null,
      });
      fromMock.mockReturnValue(query);

      await expect(resolvePatronymeIdsBySpelling(spelling)).resolves.toEqual([
        "PAT_DIALLO",
      ]);
      expect(query.ilike).toHaveBeenCalledWith("name_text", spelling);
    }
  );

  // @req REQ-135
  it("allows an ordinary lookup to have no declared match", async () => {
    const query = buildNameRecordsQuery({ data: [], error: null });
    fromMock.mockReturnValue(query);

    await expect(resolvePatronymeIdsBySpelling("Unknown")).resolves.toEqual([]);
  });

  // @req REQ-135
  it("throws a typed gap error when a required reference spelling is absent", async () => {
    const query = buildNameRecordsQuery({ data: [], error: null });
    fromMock.mockReturnValue(query);

    const request = resolveRequiredPatronymeIdsBySpelling("Dickbeu", "Dikembe");

    await expect(request).rejects.toBeInstanceOf(DeclaredNameVariantGapError);
    await expect(request).rejects.toMatchObject({
      spelling: "Dickbeu",
      expectedCanonical: "Dikembe",
    });
    await expect(request).rejects.toThrow(/Dickbeu.*Dikembe/);
  });

  // @req REQ-135
  it("logs database failures with structured context before propagating them", async () => {
    const databaseError = { message: "database unavailable" };
    const query = buildNameRecordsQuery({ data: null, error: databaseError });
    fromMock.mockReturnValue(query);

    await expect(resolvePatronymeIdsBySpelling("Diallo")).rejects.toThrow(
      "database unavailable"
    );
    expect(loggerErrorMock).toHaveBeenCalledWith(
      "Failed to resolve declared patronyme spelling",
      databaseError,
      { spelling: "Diallo" }
    );
  });
});
