import { describe, expect, it, vi } from "vitest";

import { loadLanguages } from "../languageProvenanceLoader";
import type { LanguageRecord } from "../languageCsvLoader";
import type { AdminClient } from "../provenanceWriter";

vi.mock("@/lib/api/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

function sourced(overrides: Partial<LanguageRecord> = {}): LanguageRecord {
  return {
    id: "yor",
    name: "Yoruba",
    familyId: "FLG_BENOUECONGO",
    nameProvenance: "sourced",
    glottocode: "yoru1245",
    source: {
      title: "Glottolog 5.3 - Yoruba",
      url: "https://glottolog.org/resource/languoid/id/yoru1245",
      tier: "official",
    },
    ...overrides,
  };
}

function derived(overrides: Partial<LanguageRecord> = {}): LanguageRecord {
  return {
    id: "ktz",
    name: "Ju|'hoan",
    familyId: "FLG_KXA",
    nameProvenance: "derived",
    ...overrides,
  };
}

interface Row {
  id: string;
  [key: string]: unknown;
}

function createSupabaseDouble() {
  const languages: Row[] = [];
  const sources: Row[] = [];
  const revisions: Row[] = [];
  const assertions: Row[] = [];
  const confidenceCalls: Array<Record<string, unknown>> = [];
  let counter = 0;
  const nextId = (prefix: string) => `${prefix}-${++counter}`;

  const upsertInto = (store: Row[], keys: string[]) =>
    vi.fn((row: Record<string, unknown>) => {
      const existing = store.find((entry) =>
        keys.every((key) => entry[key] === row[key])
      );
      if (existing) {
        Object.assign(existing, row);
      } else {
        store.push({ id: nextId("row"), ...row } as Row);
      }

      return {
        select: vi.fn(() => ({
          single: vi.fn(async () => {
            const record = store.find((entry) =>
              keys.every((key) => entry[key] === row[key])
            )!;
            return { data: { id: record.id }, error: null };
          }),
        })),
        then: (resolve: (value: { error: null }) => unknown) =>
          resolve({ error: null }),
      };
    });

  const from = vi.fn((table: string) => {
    if (table === "afrik_languages")
      return { upsert: upsertInto(languages, ["id"]) };
    if (table === "sources") return { upsert: upsertInto(sources, ["title"]) };
    if (table === "fiche_revisions")
      return {
        upsert: upsertInto(revisions, ["entity_type", "entity_id", "version"]),
      };
    if (table === "assertions") {
      return {
        select: vi.fn(() => {
          const filters: Record<string, unknown> = {};
          const builder = {
            eq: vi.fn((column: string, value: unknown) => {
              filters[column] = value;
              return builder;
            }),
            maybeSingle: vi.fn(async () => ({
              data:
                assertions.find((entry) =>
                  Object.entries(filters).every(
                    ([column, value]) => entry[column] === value
                  )
                ) ?? null,
              error: null,
            })),
          };
          return builder;
        }),
        update: vi.fn((patch: Record<string, unknown>) => ({
          eq: vi.fn(async (_column: string, id: string) => {
            const existing = assertions.find((entry) => entry.id === id);
            if (existing) Object.assign(existing, patch);
            return { error: null };
          }),
        })),
        insert: vi.fn((row: Record<string, unknown>) => ({
          select: vi.fn(() => ({
            single: vi.fn(async () => {
              const created = { id: nextId("assert"), ...row };
              assertions.push(created);
              return { data: { id: created.id }, error: null };
            }),
          })),
        })),
      };
    }
    throw new Error(`unexpected table ${table}`);
  });

  const rpc = vi.fn(async (_name: string, args: Record<string, unknown>) => {
    confidenceCalls.push(args);
    return { error: null };
  });

  return {
    client: { from, rpc },
    languages,
    sources,
    revisions,
    assertions,
    confidenceCalls,
  };
}

const asClient = (double: ReturnType<typeof createSupabaseDouble>) =>
  double.client as unknown as AdminClient;

describe("loadLanguages", () => {
  // AC: each CSV row's family and official-tier Glottolog source is retrievable via the provenance path.
  // @req REQ-136
  it("persists a CSV language with its family and an official-tier source", async () => {
    const double = createSupabaseDouble();

    const report = await loadLanguages(asClient(double), [sourced()]);

    expect(report.sourced).toBe(1);
    expect(double.languages[0]).toMatchObject({
      id: "yor",
      name: "Yoruba",
      family_id: "FLG_BENOUECONGO",
      content: { nameProvenance: "sourced" },
    });
    expect(double.sources[0]).toMatchObject({ tier: "official" });
    expect(double.assertions[0]).toMatchObject({
      entity_type: "language",
      entity_id: "yor",
      source_ids: [double.sources[0].id],
    });
  });

  // AC: an enriched fiche persists all public content and every explicit source.
  // @req REQ-136
  it("persists enriched fiche content, aliases, and all source tiers", async () => {
    const double = createSupabaseDouble();

    await loadLanguages(asClient(double), [
      sourced({
        nameFr: "Yoruba",
        nameEn: "Yoruba",
        alternateNames: ["Yariba", "Aku"],
        spellingAliases: ["Yorouba"],
        peoples: [{ name: "Yoruba", peopleId: "PPL_YORUBA" }],
        vehicularRole: "regional_lingua_franca",
        dialects: ["Oyo", "Ijebu"],
        vitalityStatus: {
          status: "Institutional",
          scale: "EGIDS (Ethnologue)",
          asOf: 2026,
        },
        source: undefined,
        sources: [
          {
            title: "Official registry",
            url: "https://example.org/official",
            tier: "official",
          },
          {
            title: "Academic reference",
            url: "https://example.org/reference",
            tier: "referenced",
          },
          {
            title: "Pending verification",
            url: null,
            tier: "unverified",
          },
        ],
      }),
    ]);

    expect(double.languages[0]).toMatchObject({
      id: "yor",
      name: "Yoruba",
      family_id: "FLG_BENOUECONGO",
      spelling_aliases: ["Yorouba"],
      content: {
        nameProvenance: "sourced",
        glottocode: "yoru1245",
        nameEn: "Yoruba",
        alternateNames: ["Yariba", "Aku"],
        peoples: [{ name: "Yoruba", peopleId: "PPL_YORUBA" }],
        vehicularRole: "regional_lingua_franca",
        dialects: ["Oyo", "Ijebu"],
        vitalityStatus: {
          status: "Institutional",
          scale: "EGIDS (Ethnologue)",
          asOf: 2026,
        },
      },
    });
    expect(double.sources.map(({ title, tier }) => ({ title, tier }))).toEqual([
      { title: "Official registry", tier: "official" },
      { title: "Academic reference", tier: "referenced" },
      { title: "Pending verification", tier: "unverified" },
    ]);
    expect(double.assertions[0]?.source_ids).toEqual(
      double.sources.map(({ id }) => id)
    );
  });

  // AC: a derived-only language is marked derived and carries no source.
  // @req REQ-136
  it("persists a derived language as derived, with no source and no assertion", async () => {
    const double = createSupabaseDouble();

    const report = await loadLanguages(asClient(double), [derived()]);

    expect(report.derived).toBe(1);
    expect(double.languages[0]).toMatchObject({
      id: "ktz",
      content: { nameProvenance: "derived" },
    });
    expect(double.sources).toHaveLength(0);
    expect(double.assertions).toHaveLength(0);
  });

  // AC: the load runs twice without creating duplicates (idempotent upsert).
  // @req REQ-136
  it("does not duplicate rows when the load runs twice", async () => {
    const double = createSupabaseDouble();

    await loadLanguages(asClient(double), [sourced()]);
    await loadLanguages(asClient(double), [sourced()]);

    expect(double.languages).toHaveLength(1);
    expect(double.assertions).toHaveLength(1);
  });

  // @req REQ-136
  it("reports the loaded count per family", async () => {
    const double = createSupabaseDouble();

    const report = await loadLanguages(asClient(double), [
      sourced(),
      sourced({ id: "yor2", familyId: "FLG_BENOUECONGO" }),
      derived({ id: "ktz2", familyId: "FLG_KXA" }),
    ]);

    expect(report.perFamily).toEqual({
      FLG_BENOUECONGO: 2,
      FLG_KXA: 1,
    });
  });

  // AC: a record with no spellingAliases loads with an empty array, not undefined or an error.
  // @req REQ-136
  it("defaults spelling_aliases to an empty array when the record omits it", async () => {
    const double = createSupabaseDouble();

    await loadLanguages(asClient(double), [sourced()]);

    expect(double.languages[0]).toMatchObject({ spelling_aliases: [] });
  });

  // AC: a single declared alias reaches the spelling_aliases column unchanged.
  // @req REQ-136
  it("maps a single spelling alias onto spelling_aliases", async () => {
    const double = createSupabaseDouble();

    await loadLanguages(asClient(double), [
      sourced({ spellingAliases: ["Yariba"] }),
    ]);

    expect(double.languages[0]).toMatchObject({
      spelling_aliases: ["Yariba"],
    });
  });

  // AC: multiple declared aliases all reach the spelling_aliases column.
  // @req REQ-136
  it("maps multiple spelling aliases onto spelling_aliases", async () => {
    const double = createSupabaseDouble();

    await loadLanguages(asClient(double), [
      sourced({ spellingAliases: ["Yariba", "Aku"] }),
    ]);

    expect(double.languages[0]).toMatchObject({
      spelling_aliases: ["Yariba", "Aku"],
    });
  });
});
