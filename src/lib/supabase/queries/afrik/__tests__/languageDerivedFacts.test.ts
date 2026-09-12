import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../server", () => ({ createServerClient: vi.fn() }));

import { createServerClient } from "../../../server";
import { getLanguageDerivedFacts } from "../languageDerivedFacts";

interface PeopleRow {
  id: string;
  content: {
    languages?: {
      isoCodes?: string[];
      dialects?: string[];
      vehicularRole?: string | null;
    };
  };
}

function runPeopleFromCorpus(): PeopleRow[] {
  const root = join(process.cwd(), "dataset/source/afrik/peuples");
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((family) =>
      readdirSync(join(root, family.name))
        .filter((file) => file.endsWith(".json"))
        .map(
          (file) =>
            JSON.parse(
              readFileSync(join(root, family.name, file), "utf8")
            ) as PeopleRow
        )
    )
    .filter((people) => people.content?.languages?.isoCodes?.includes("run"));
}

function mockServer(rows: PeopleRow[], linkedIds = rows.map((row) => row.id)) {
  const ranges: Array<{ table: string; start: number; end: number }> = [];
  const from = vi.fn((table: string) => {
    let languageId: string | undefined;
    let ids: string[] | undefined;
    const query = {
      select: vi.fn(() => query),
      order: vi.fn(() => query),
      eq: vi.fn((column: string, value: string) => {
        if (column === "language_id") languageId = value;
        return query;
      }),
      in: vi.fn((column: string, values: string[]) => {
        if (column === "id") ids = values;
        return query;
      }),
      range: vi.fn(async (start: number, end: number) => {
        ranges.push({ table, start, end });
        const data =
          table === "afrik_people_languages"
            ? linkedIds
                .map((people_id) => ({ people_id, language_id: "run" }))
                .filter((row) => row.language_id === languageId)
                .sort((a, b) => a.people_id.localeCompare(b.people_id))
                .slice(start, end + 1)
            : rows
                .filter((row) => ids?.includes(row.id))
                .sort((a, b) => a.id.localeCompare(b.id))
                .slice(start, end + 1);
        return {
          data,
          error: null,
        };
      }),
    };
    return query;
  });
  vi.mocked(createServerClient).mockReturnValue({
    from,
  } as unknown as ReturnType<typeof createServerClient>);
  return { from, ranges };
}

describe("getLanguageDerivedFacts", () => {
  beforeEach(() => vi.clearAllMocks());

  // @req REQ-119
  it("derives 34 distinct run dialects from the actual ISO-linked peoples and records their IDs", async () => {
    const peoples = runPeopleFromCorpus().sort((a, b) =>
      a.id.localeCompare(b.id)
    );
    const { from, ranges } = mockServer(peoples);

    const facts = await getLanguageDerivedFacts({ id: "run", content: {} });

    expect(peoples).toHaveLength(7);
    expect(facts.dialects).toEqual({
      value: [
        ...new Set(
          peoples.flatMap((row) => row.content.languages?.dialects ?? [])
        ),
      ],
      provenance: "derived",
      from: peoples.map((row) => row.id),
    });
    expect(facts.dialects.value).toHaveLength(34);
    expect(facts.vehicularRole).toEqual({
      value: [
        ...new Set(
          peoples
            .map((row) => row.content.languages?.vehicularRole)
            .filter((role): role is string => Boolean(role))
        ),
      ],
      provenance: "derived",
      from: peoples.map((row) => row.id),
    });
    expect(from).toHaveBeenCalledWith("afrik_people_languages");
    expect(from).toHaveBeenCalledWith("afrik_peoples");
    expect(ranges.map(({ table }) => table)).toContain(
      "afrik_people_languages"
    );
    expect(ranges.map(({ table }) => table)).toContain("afrik_peoples");
  });

  // @req REQ-119
  it("keeps declared language facts authoritative and skips derivation", async () => {
    const { from } = mockServer(runPeopleFromCorpus());

    const facts = await getLanguageDerivedFacts({
      id: "run",
      content: {
        dialects: ["Declared dialect"],
        vehicularRole: "regional_lingua_franca",
      },
    });

    expect(facts).toEqual({
      dialects: { value: ["Declared dialect"], provenance: "declared" },
      vehicularRole: {
        value: ["regional_lingua_franca"],
        provenance: "declared",
      },
    });
    expect(from).not.toHaveBeenCalled();
  });

  // @req REQ-119
  it("derives only missing fields and ignores a stale link without an ISO declaration", async () => {
    mockServer([
      {
        id: "PPL_VALID",
        content: {
          languages: {
            isoCodes: ["run"],
            dialects: ["Dialect A"],
            vehicularRole: "Regional prose",
          },
        },
      },
      {
        id: "PPL_STALE",
        content: {
          languages: {
            isoCodes: ["kin"],
            dialects: ["Wrong dialect"],
            vehicularRole: "Wrong prose",
          },
        },
      },
    ]);

    const facts = await getLanguageDerivedFacts({
      id: "run",
      content: { dialects: ["Declared"] },
    });

    expect(facts.dialects).toEqual({
      value: ["Declared"],
      provenance: "declared",
    });
    expect(facts.vehicularRole).toEqual({
      value: ["Regional prose"],
      provenance: "derived",
      from: ["PPL_VALID"],
    });
  });

  // @req REQ-119
  it("marks absent facts missing when no people declares the language", async () => {
    mockServer([]);

    await expect(
      getLanguageDerivedFacts({ id: "run", content: {} })
    ).resolves.toEqual({
      dialects: { value: [], provenance: "missing" },
      vehicularRole: { value: [], provenance: "missing" },
    });
  });

  // @req REQ-119
  it("walks beyond the first join page without dropping later peoples", async () => {
    const peoples = Array.from({ length: 501 }, (_, index) => ({
      id: `PPL_${index}`,
      content: {
        languages: {
          isoCodes: ["run"],
          dialects: [`Dialect ${index}`],
        },
      },
    }));
    const { ranges } = mockServer(peoples);

    const facts = await getLanguageDerivedFacts({ id: "run", content: {} });

    expect(facts.dialects.value).toHaveLength(501);
    expect(facts.dialects.value).toContain("Dialect 500");
    expect(ranges).toContainEqual({
      table: "afrik_people_languages",
      start: 500,
      end: 999,
    });
    expect(ranges.every(({ end, start }) => end - start < 1000)).toBe(true);
  });
});
