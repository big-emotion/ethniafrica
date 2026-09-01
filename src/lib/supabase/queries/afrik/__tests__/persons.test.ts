import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../server", () => ({
  createServerClient: vi.fn(),
}));

import { getPersonById } from "../persons";
import { createServerClient } from "../../../server";

describe("AFRIK Persons Queries", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockSupabase: any;

  /* eslint-disable @typescript-eslint/no-explicit-any */
  function setupMock(options: {
    personRow?: any;
    personError?: any;
    peopleLinkRows?: any[];
    countryRows?: any[];
    assertionRow?: any;
    sourceRows?: any[];
  }) {
    /* eslint-enable @typescript-eslint/no-explicit-any */
    const {
      personRow,
      personError,
      peopleLinkRows,
      countryRows,
      assertionRow,
      sourceRows,
    } = options;

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "persons") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(async () => ({
                data: personRow ?? null,
                error: personError ?? null,
              })),
            })),
          })),
        };
      }

      if (table === "person_peoples") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(async () => ({
              data: peopleLinkRows ?? [],
              error: null,
            })),
          })),
        };
      }

      if (table === "person_countries") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(async () => ({
              data: countryRows ?? [],
              error: null,
            })),
          })),
        };
      }

      if (table === "assertions") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({
                data: assertionRow ?? null,
                error: null,
              })),
            })),
          })),
        };
      }

      if (table === "sources") {
        return {
          select: vi.fn(() => ({
            in: vi.fn(async () => ({ data: sourceRows ?? [], error: null })),
          })),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });
  }

  beforeEach(() => {
    mockSupabase = { from: vi.fn() };
    vi.mocked(createServerClient).mockReturnValue(mockSupabase);
  });

  describe("getPersonById", () => {
    // AC (ETNI-1382/ETNI-1587): role category, people join (with
    // membership/observation label) and country join are returned.
    // @req REQ-137
    it("returns the role category, people join and country join", async () => {
      setupMock({
        personRow: {
          id: "PER_DELAFOSSE",
          full_name: "Maurice Delafosse",
          role_category: "ethnographer",
          assertion_id: "assert-1",
        },
        peopleLinkRows: [
          { people_id: "PPL_BAMBARA", relation_label: "observation" },
        ],
        countryRows: [{ country_id: "MLI" }],
        assertionRow: { source_ids: ["src-1"] },
        sourceRows: [
          {
            title: "Haut-Sénégal-Niger",
            author: "Maurice Delafosse",
            year: 1912,
            url: "https://example.org/hsn",
            tier: "referenced",
            notes: null,
          },
        ],
      });

      const person = await getPersonById("PER_DELAFOSSE");

      expect(person).toMatchObject({
        id: "PER_DELAFOSSE",
        roleCategory: "ethnographer",
        countryIds: ["MLI"],
      });
      expect(person?.peopleLinks).toEqual([
        { peopleId: "PPL_BAMBARA", relationLabel: "observation" },
      ]);
    });

    // AC (ETNI-1382/ETNI-1587): attached sources are returned with their
    // explicit tier.
    // @req REQ-137
    it("returns attached sources with their explicit tier", async () => {
      setupMock({
        personRow: {
          id: "PER_DELAFOSSE",
          full_name: "Maurice Delafosse",
          role_category: "ethnographer",
          assertion_id: "assert-1",
        },
        peopleLinkRows: [],
        countryRows: [],
        assertionRow: { source_ids: ["src-1"] },
        sourceRows: [
          {
            title: "Haut-Sénégal-Niger",
            author: "Maurice Delafosse",
            year: 1912,
            url: "https://example.org/hsn",
            tier: "referenced",
            notes: null,
          },
        ],
      });

      const person = await getPersonById("PER_DELAFOSSE");

      expect(person?.sources).toEqual([
        expect.objectContaining({
          title: "Haut-Sénégal-Niger",
          tier: "referenced",
        }),
      ]);
    });

    // AC3 (ETNI-1382): an ethnographer's people link is exposed as
    // observation, never membership.
    // @req REQ-137
    it("exposes an ethnographer's people link as observation, never membership", async () => {
      setupMock({
        personRow: {
          id: "PER_DELAFOSSE",
          full_name: "Maurice Delafosse",
          role_category: "ethnographer",
          assertion_id: "assert-1",
        },
        peopleLinkRows: [
          { people_id: "PPL_BAMBARA", relation_label: "observation" },
        ],
        countryRows: [],
        assertionRow: null,
        sourceRows: [],
      });

      const person = await getPersonById("PER_DELAFOSSE");

      expect(person?.peopleLinks[0].relationLabel).toBe("observation");
      expect(person?.peopleLinks[0].relationLabel).not.toBe("membership");
    });

    // @req REQ-137
    it("returns null for a non-existent person (PGRST116)", async () => {
      setupMock({ personError: { code: "PGRST116" } });

      const person = await getPersonById("PER_UNKNOWN");

      expect(person).toBeNull();
    });
  });
});
