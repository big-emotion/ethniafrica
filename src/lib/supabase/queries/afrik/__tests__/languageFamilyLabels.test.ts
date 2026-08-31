import { describe, it, expect, vi, beforeEach } from "vitest";

const fromMock = vi.fn();

vi.mock("../../../server", () => ({
  createServerClient: () => ({ from: fromMock }),
}));

vi.mock("@/lib/api/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { getLanguageFamilyLabels } from "../languageFamilyLabels";

function buildChainable(result: {
  data: unknown;
  error: { message: string } | null;
}) {
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "order"]) {
    builder[method] = vi.fn(() => builder);
  }
  builder.then = (resolve: (v: unknown) => void) => resolve(result);
  return builder;
}

const row = { id: "FLG_NIGER_CONGO", name_fr: "Niger-Congo" };

beforeEach(() => {
  fromMock.mockReset();
});

describe("getLanguageFamilyLabels", () => {
  // @req REQ-115
  it("returns each family as an id and a name", async () => {
    const builder = buildChainable({ data: [row], error: null });
    fromMock.mockImplementation(() => builder);

    expect(await getLanguageFamilyLabels()).toEqual([
      { id: "FLG_NIGER_CONGO", nameFr: "Niger-Congo" },
    ]);
  });

  // The editorial JSONB on this table runs to tens of KB for a large
  // family. Twenty-four of those crossed and thrown away is the whole
  // reason this query exists beside getAllAfrikLanguageFamilies.
  // @req REQ-115
  it("asks for two columns, never the editorial content", async () => {
    const builder = buildChainable({ data: [row], error: null });
    fromMock.mockImplementation(() => builder);

    await getLanguageFamilyLabels();

    const selected = (builder.select as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(selected).toBe("id, name_fr");
    expect(selected).not.toContain("*");
    expect(selected).not.toContain("content");
  });

  // @req REQ-115
  it("returns nothing rather than throwing into the render", async () => {
    const builder = buildChainable({ data: null, error: { message: "boom" } });
    fromMock.mockImplementation(() => builder);

    expect(await getLanguageFamilyLabels()).toEqual([]);
  });
});
