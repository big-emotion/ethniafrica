import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const flagsQuery = {
    select: vi.fn(),
    in: vi.fn(),
    or: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
  };
  const assertionsQuery = {
    select: vi.fn(),
    in: vi.fn(),
  };
  const profilesQuery = {
    select: vi.fn(),
    eq: vi.fn(),
    or: vi.fn(),
  };
  const entityLabelsQuery = {
    select: vi.fn(),
    in: vi.fn(),
  };
  const sourceLabelsQuery = {
    select: vi.fn(),
    in: vi.fn(),
  };
  const client = {
    from: vi.fn((table: string) => {
      if (table === "flags") return flagsQuery;
      if (table === "assertions") return assertionsQuery;
      if (table.startsWith("afrik_")) return entityLabelsQuery;
      if (table === "sources") return sourceLabelsQuery;
      return profilesQuery;
    }),
  };

  return {
    assertionsQuery,
    client,
    createServerClient: vi.fn(() => client),
    flagsQuery,
    entityLabelsQuery,
    profilesQuery,
    sourceLabelsQuery,
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: mocks.createServerClient,
}));

import { createServerClient } from "@/lib/supabase/server";
import { getPublicFlagsPage } from "@/lib/supabase/queries/flags/getPublicFlagsPage";
import { queryPublicFlagsPage } from "@/lib/supabase/queries/flags/publicFlagsPageQuery";

const makeFlag = (index: number, overrides: Record<string, unknown> = {}) => ({
  id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
  public_slug: `FLAG${String(index).padStart(6, "0")}`,
  flag_kind: "inaccurate",
  status: "open",
  entity_type: "source",
  entity_id: `source-${index}`,
  reason_text: `Reason ${index}`,
  contributor_id: null,
  assertion_id: null,
  assertion_field_path: null,
  severity: "medium",
  auto_generated: false,
  created_at: `2026-07-24T12:${String(59 - index).padStart(2, "0")}:00.000Z`,
  ...overrides,
});

describe("queryPublicFlagsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.flagsQuery.select.mockReturnValue(mocks.flagsQuery);
    mocks.flagsQuery.in.mockReturnValue(mocks.flagsQuery);
    mocks.flagsQuery.or.mockReturnValue(mocks.flagsQuery);
    mocks.flagsQuery.order.mockReturnValue(mocks.flagsQuery);
    mocks.flagsQuery.limit.mockResolvedValue({ data: [], error: null });

    mocks.assertionsQuery.select.mockReturnValue(mocks.assertionsQuery);
    mocks.assertionsQuery.in.mockResolvedValue({ data: [], error: null });

    mocks.profilesQuery.select.mockReturnValue(mocks.profilesQuery);
    mocks.profilesQuery.eq.mockReturnValue(mocks.profilesQuery);
    mocks.profilesQuery.or.mockResolvedValue({ data: [], error: null });

    mocks.entityLabelsQuery.select.mockReturnValue(mocks.entityLabelsQuery);
    mocks.entityLabelsQuery.in.mockResolvedValue({ data: [], error: null });

    mocks.sourceLabelsQuery.select.mockReturnValue(mocks.sourceLabelsQuery);
    mocks.sourceLabelsQuery.in.mockResolvedValue({ data: [], error: null });
  });

  // @req REQ-014
  it("orders by a stable pair, caps pages at 50, and emits an opaque cursor", async () => {
    const rows = Array.from({ length: 51 }, (_, index) => makeFlag(index));
    mocks.flagsQuery.limit.mockResolvedValue({ data: rows, error: null });

    const page = await queryPublicFlagsPage(createServerClient(), {
      pageSize: 100,
    });

    expect(mocks.flagsQuery.order).toHaveBeenNthCalledWith(1, "created_at", {
      ascending: false,
    });
    expect(mocks.flagsQuery.order).toHaveBeenNthCalledWith(2, "id", {
      ascending: false,
    });
    expect(mocks.flagsQuery.limit).toHaveBeenCalledWith(51);
    expect(page.items).toHaveLength(50);
    expect(page.nextCursor).toEqual(expect.any(String));
    expect(page.nextCursor).not.toContain(rows[49].created_at);
    expect(page.nextCursor).not.toContain(rows[49].id);

    mocks.flagsQuery.limit.mockResolvedValue({ data: [], error: null });
    await queryPublicFlagsPage(createServerClient(), {
      cursor: page.nextCursor ?? undefined,
    });

    expect(mocks.flagsQuery.or).toHaveBeenCalledWith(
      `created_at.lt.${rows[49].created_at},and(created_at.eq.${rows[49].created_at},id.lt.${rows[49].id})`
    );

    mocks.flagsQuery.or.mockClear();
    await queryPublicFlagsPage(createServerClient(), {
      cursor: page.nextCursor ?? undefined,
      targetTypes: ["source"],
    });

    expect(mocks.flagsQuery.or).toHaveBeenCalledOnce();
    expect(mocks.flagsQuery.or).toHaveBeenCalledWith(
      `and(or(and(assertion_id.is.null,entity_type.in.(source))),or(created_at.lt.${rows[49].created_at},and(created_at.eq.${rows[49].created_at},id.lt.${rows[49].id})))`
    );
  });

  // @req REQ-014
  it("applies multi-value status, kind, and target filters", async () => {
    await queryPublicFlagsPage(createServerClient(), {
      statuses: ["open", "accepted"],
      kinds: ["inaccurate", "missing-source"],
      targetTypes: ["assertion", "source"],
    });

    expect(mocks.flagsQuery.in).toHaveBeenCalledWith("status", [
      "open",
      "accepted",
    ]);
    expect(mocks.flagsQuery.in).toHaveBeenCalledWith("flag_kind", [
      "inaccurate",
      "missing-source",
    ]);
    expect(mocks.flagsQuery.or).toHaveBeenCalledWith(
      "assertion_id.not.is.null,and(assertion_id.is.null,entity_type.in.(source))"
    );
  });

  // @req REQ-014
  it("rejects cursors whose timestamp or identifier could inject filter grammar", async () => {
    const forgedCursor = btoa(
      JSON.stringify({
        createdAt: "2026-07-24T12:00:00.000Z),id.not.is.null",
        id: "not-a-uuid",
      })
    );

    await expect(
      queryPublicFlagsPage(createServerClient(), { cursor: forgedCursor })
    ).rejects.toThrow("Invalid public flags cursor");
    expect(mocks.flagsQuery.limit).not.toHaveBeenCalled();
  });

  // @req REQ-014
  it("keeps direct entity flags in the public queue without a target filter", async () => {
    mocks.flagsQuery.limit.mockResolvedValue({
      data: [
        makeFlag(1, {
          entity_type: "people",
          entity_id: "PPL_BETI",
        }),
        makeFlag(2, {
          entity_type: "country",
          entity_id: "CMR",
        }),
      ],
      error: null,
    });

    const page = await queryPublicFlagsPage(createServerClient());

    expect(page.items.map(({ target }) => target.type)).toEqual([
      "fiche_section",
      "fiche_section",
    ]);
    expect(mocks.flagsQuery.or).not.toHaveBeenCalled();
  });

  // @req REQ-014
  it("derives target context and exposes only privacy-safe contributor names", async () => {
    mocks.flagsQuery.limit.mockResolvedValue({
      data: [
        makeFlag(1, {
          assertion_id: "assertion-1",
          assertion_field_path: "content.population",
          contributor_id: "user-public",
        }),
        makeFlag(2, {
          entity_type: "fiche_section",
          entity_id: "section-2",
          assertion_field_path: "content.history",
          contributor_id: "user-private",
        }),
        makeFlag(3, {
          entity_type: "classification",
          entity_id: "classification-3",
        }),
        makeFlag(4, {
          entity_type: "source",
          entity_id: "00000000-0000-4000-8000-000000000004",
        }),
      ],
      error: null,
    });
    mocks.assertionsQuery.in.mockResolvedValue({
      data: [
        {
          id: "assertion-1",
          entity_type: "people",
          entity_id: "PPL_TEST",
          field_path: "content.population",
          statement: "A contested population statement",
        },
      ],
      error: null,
    });
    mocks.entityLabelsQuery.in.mockResolvedValue({
      data: [{ id: "PPL_TEST", name_main: "Beti" }],
      error: null,
    });
    mocks.sourceLabelsQuery.in.mockResolvedValue({
      data: [
        {
          id: "00000000-0000-4000-8000-000000000004",
          title: "UNESCO cultural report",
        },
      ],
      error: null,
    });
    mocks.profilesQuery.or.mockResolvedValue({
      data: [
        {
          id: "profile-public",
          user_id: "user-public",
          display_name: "Amina",
          public: true,
        },
        {
          id: "profile-private",
          user_id: "user-private",
          display_name: "Hidden name",
          public: false,
        },
      ],
      error: null,
    });

    const page = await queryPublicFlagsPage(createServerClient());

    expect(page.items[0].target).toEqual({
      type: "assertion",
      id: "assertion-1",
      entityType: "people",
      entityId: "PPL_TEST",
      fieldPath: "content.population",
      label: "Beti",
      statement: "A contested population statement",
    });
    expect(page.items[0].contributorName).toBe("Amina");
    expect(page.items[1].target).toEqual({
      type: "fiche_section",
      id: "section-2",
      entityType: "fiche_section",
      entityId: "section-2",
      fieldPath: "content.history",
      label: "section-2",
      statement: null,
    });
    expect(page.items[1].contributorName).toBe("");
    expect(page.items[2].target.type).toBe("classification");
    expect(page.items[3].target.label).toBe("UNESCO cultural report");
    expect(mocks.profilesQuery.eq).toHaveBeenCalledWith("public", true);
  });
});

describe("getPublicFlagsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.flagsQuery.select.mockReturnValue(mocks.flagsQuery);
    mocks.flagsQuery.or.mockReturnValue(mocks.flagsQuery);
    mocks.flagsQuery.order.mockReturnValue(mocks.flagsQuery);
    mocks.flagsQuery.limit.mockResolvedValue({ data: [], error: null });
  });

  // @req REQ-014
  it("uses the anonymous SSR Supabase client", async () => {
    await getPublicFlagsPage();

    expect(mocks.createServerClient).toHaveBeenCalledOnce();
    expect(mocks.client.from).toHaveBeenCalledWith("flags");
  });
});
