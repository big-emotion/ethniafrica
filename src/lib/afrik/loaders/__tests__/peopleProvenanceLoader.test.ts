/**
 * The people corpus shipped without a provenance layer: `afrik_peoples.content`
 * was written and nothing else, so every people scored exactly 0 confidence
 * and the quiz rejected all its candidates on `no_assertion`. These tests hold
 * the two rules that matter while closing that gap — a fiche is never credited
 * with a claim it does not make, nor with a source it does not cite.
 */
import { describe, expect, it, vi } from "vitest";

import {
  loadPeopleProvenance,
  peopleAssertionTargets,
  type PeopleFiche,
} from "../peopleProvenanceLoader";

vi.mock("@/lib/api/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

function fiche(overrides: Partial<PeopleFiche> = {}): PeopleFiche {
  return {
    id: "PPL_YORUBA",
    languageFamilyId: "FLG_NIGER_CONGO",
    content: {
      appellations: { selfAppellation: "Yorùbá" },
      demography: {
        distributionByCountry: [
          { country: "BEN", countryNameFr: "Bénin", population: 1_200_000 },
          { country: "NGA", countryNameFr: "Nigeria", population: 40_000_000 },
        ],
      },
      languages: { mainLanguage: "Èdè Yorùbá", isoCodes: ["yor"] },
      sources: [
        {
          title: "Ethnologue — Yoruba",
          url: "https://www.ethnologue.com/",
          tier: "referenced",
        },
      ],
    },
    ...overrides,
  };
}

interface Row {
  id: string;
  [key: string]: unknown;
}

function createSupabaseDouble() {
  const sources: Row[] = [];
  const revisions: Row[] = [];
  const assertions: Row[] = [];
  const confidenceCalls: Array<Record<string, unknown>> = [];
  let counter = 0;
  const nextId = (prefix: string) => `${prefix}-${++counter}`;

  const upsertInto = (store: Row[], keys: string[]) =>
    vi.fn((row: Record<string, unknown>) => ({
      select: vi.fn(() => ({
        single: vi.fn(async () => {
          const existing = store.find((entry) =>
            keys.every((key) => entry[key] === row[key])
          );
          if (existing) {
            Object.assign(existing, row);
            return { data: { id: existing.id }, error: null };
          }
          const created = { id: nextId("row"), ...row };
          store.push(created);
          return { data: { id: created.id }, error: null };
        }),
      })),
    }));

  const from = vi.fn((table: string) => {
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
    sources,
    revisions,
    assertions,
    confidenceCalls,
  };
}

const asClient = (double: ReturnType<typeof createSupabaseDouble>) =>
  double.client as any;

describe("peopleAssertionTargets", () => {
  // @req REQ-092
  it("records one claim per field the surfaces read", () => {
    expect(peopleAssertionTargets(fiche()).map((t) => t.fieldPath)).toEqual([
      "languageFamilyId",
      "content.appellations.selfAppellation",
      "content.demography.distributionByCountry",
      "content.languages.mainLanguage",
      "content.languages.isoCodes",
    ]);
  });

  // @req REQ-092
  it("makes no claim for a field the fiche leaves empty", () => {
    const incomplete = fiche({
      languageFamilyId: undefined,
      content: {
        ...fiche().content,
        languages: { mainLanguage: "Èdè Yorùbá", isoCodes: [] },
      },
    });

    const paths = peopleAssertionTargets(incomplete).map((t) => t.fieldPath);
    expect(paths).not.toContain("languageFamilyId");
    expect(paths).not.toContain("content.languages.isoCodes");
  });

  /**
   * The inversion templates cannot generate without a row here: FR66 refuses a
   * question whose field path has no assertion behind it, and until this loader
   * wrote them the whole prose half of the corpus produced `no_assertion`.
   */
  // @req REQ-121
  it("asserts a prose rubric at the path the inversion template reads", () => {
    const withRites = fiche({
      content: {
        ...fiche().content,
        appellations: {
          mainName: "Yoruba",
          selfAppellation: "Yorùbá",
          exonyms: ["Yoruba people"],
        },
        culture: {
          majorRites:
            "Les ceremonies des recoltes rassemblent les lignages autour du roi chaque annee, en septembre.",
        },
      },
    });

    const target = peopleAssertionTargets(withRites).find(
      (t) => t.fieldPath === "content.culture.majorRites"
    );
    expect(target?.statement).toBe(
      "Les ceremonies des recoltes rassemblent les lignages autour du roi chaque annee, en septembre."
    );
  });

  /**
   * 31 fiches hold a serialised JSON object where their culture prose belongs.
   * The fragment selector split those braces on the periods inside them and the
   * loader wrote the pieces out as claims — an assertion the fiche never made,
   * shown verbatim in the source-chain sheet. A field that holds no prose must
   * assert nothing.
   */
  // @req REQ-122
  it("asserts nothing from a rubric holding a serialised JSON object", () => {
    const withJson = fiche({
      content: {
        ...fiche().content,
        culture: {
          majorRites:
            '{"initiationRites": {"maleInitiation": "L\'initiation masculine (gar) est le rite de passage le plus important de la societe."}}',
        },
      },
    });

    expect(
      peopleAssertionTargets(withJson).find(
        (t) => t.fieldPath === "content.culture.majorRites"
      )
    ).toBeUndefined();
  });

  /**
   * The corpus carries the markup; a claim quoted back to a player must not.
   */
  // @req REQ-122
  it("strips the markup before a rubric becomes an assertion statement", () => {
    const withMarkup = fiche({
      content: {
        ...fiche().content,
        culture: {
          majorRites:
            "Les **ceremonies des recoltes** rassemblent les lignages autour du *roi* chaque annee, en septembre.",
        },
      },
    });

    const target = peopleAssertionTargets(withMarkup).find(
      (t) => t.fieldPath === "content.culture.majorRites"
    );
    expect(target?.statement).toBe(
      "Les ceremonies des recoltes rassemblent les lignages autour du roi chaque annee, en septembre."
    );
  });

  /**
   * The statement is the fragment a question will actually quote, not the whole
   * rubric — an assertion records the claim that gets made, and the sentence
   * naming the subject never reaches a reader.
   */
  // @req REQ-121
  it("asserts only the part of the rubric a round may show", () => {
    const withLeak = fiche({
      content: {
        ...fiche().content,
        appellations: {
          mainName: "Yoruba",
          selfAppellation: "Yorùbá",
          exonyms: [],
        },
        culture: {
          majorRites:
            "Le peuple Yoruba celebre la fete des ignames chaque annee au mois de septembre. Les lignages se rassemblent alors autour du roi pour trois jours de tambours.",
        },
      },
    });

    const target = peopleAssertionTargets(withLeak).find(
      (t) => t.fieldPath === "content.culture.majorRites"
    );
    expect(target?.statement).not.toContain("Yoruba");
    expect(target?.statement).toContain("Les lignages se rassemblent");
  });

  // @req REQ-121
  it("asserts the contested exonym, and nothing when the passage is ambiguous", () => {
    const contested = (whyProblematic: string) =>
      peopleAssertionTargets(
        fiche({
          content: {
            ...fiche().content,
            appellations: {
              selfAppellation: "Yorùbá",
              exonyms: ["Nago", "Anago", "Lucumi", "Aku"],
              whyProblematic,
            },
          },
        })
      ).find((t) => t.fieldPath === "content.appellations.whyProblematic");

    expect(contested("Le terme Nago est juge reducteur.")?.statement).toBe(
      "Nago"
    );
    expect(contested("Ni Nago ni Lucumi ne conviennent.")).toBeUndefined();
  });

  // @req REQ-092
  it("names the country the people is principally present in", () => {
    const target = peopleAssertionTargets(fiche()).find(
      (t) => t.fieldPath === "content.demography.distributionByCountry"
    );
    // Nigeria, not the first country listed — the same reduction the quiz's
    // staleness check performs, so the two cannot disagree.
    expect(target?.statement).toBe("Nigeria");
  });
});

describe("loadPeopleProvenance", () => {
  // @req REQ-092
  it("binds every claim to the sources the fiche cites", async () => {
    const double = createSupabaseDouble();

    const report = await loadPeopleProvenance(asClient(double), [fiche()]);

    expect(report.assertionsWritten).toBe(5);
    expect(double.sources).toHaveLength(1);
    for (const assertion of double.assertions) {
      expect(assertion.source_ids).toEqual([double.sources[0].id]);
      expect(assertion.entity_type).toBe("people");
      expect(assertion.fiche_revision_id).toBe(double.revisions[0].id);
    }
  });

  // @req REQ-092
  it("skips a fiche that cites nothing rather than asserting on no evidence", async () => {
    const double = createSupabaseDouble();

    const report = await loadPeopleProvenance(asClient(double), [
      fiche({ content: { ...fiche().content, sources: [] } }),
    ]);

    // An assertion with no source would raise this people's confidence for
    // having claimed something, which inverts what the score means.
    expect(report.skippedWithoutSources).toBe(1);
    expect(report.assertionsWritten).toBe(0);
    expect(double.assertions).toHaveLength(0);
  });

  // @req REQ-092
  it("stores a source awaiting review with no tier at all", async () => {
    const double = createSupabaseDouble();

    await loadPeopleProvenance(asClient(double), [
      fiche({
        content: {
          ...fiche().content,
          sources: ["Une source ancienne, citée sans standing"],
        },
      }),
    ]);

    // Folding `needs_review` onto `unverified` would state a judgement nobody
    // has made.
    expect(double.sources[0].tier).toBeNull();
  });

  // @req REQ-092
  it("updates rather than duplicates when the corpus is loaded twice", async () => {
    const double = createSupabaseDouble();

    await loadPeopleProvenance(asClient(double), [fiche()]);
    await loadPeopleProvenance(asClient(double), [fiche()]);

    expect(double.assertions).toHaveLength(5);
  });

  // @req REQ-092
  it("seeds the confidence score, which no trigger does on its own", async () => {
    const double = createSupabaseDouble();

    await loadPeopleProvenance(asClient(double), [fiche()]);

    expect(double.confidenceCalls).toEqual([
      { p_entity_type: "people", p_entity_id: "PPL_YORUBA" },
    ]);
  });
});
