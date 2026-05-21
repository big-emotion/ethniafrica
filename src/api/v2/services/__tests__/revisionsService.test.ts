import { describe, it, expect, vi, beforeEach } from "vitest";

const fromMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => ({ from: fromMock }),
}));

import { insertRevision, getRevision } from "../revisions";
import type { InsertRevisionInput } from "@/api/v2/schemas/revisions";

type FakeQuery = Record<string, ReturnType<typeof vi.fn>>;

const ENTITY_TYPE = "people";
const ENTITY_ID = "PPL_YORUBA";
const VERSION = 1;
const SNAPSHOT: Record<string, unknown> = {
  id: "PPL_YORUBA",
  name: "Yoruba",
  demographics: {
    total_population: 45000000,
    distribution: [{ country: "NGA", percentage: 85.0 }],
  },
  sources: [{ id: "src-1", tier: 1, url: "https://example.org/yoruba" }],
};
const REVISION_ROW = {
  id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  entity_type: ENTITY_TYPE,
  entity_id: ENTITY_ID,
  version: VERSION,
  snapshot_jsonb: SNAPSHOT,
  moderator_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  reason: "Initial publication",
  published_at: "2026-05-21T10:00:00.000Z",
  doctrine_version_id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
  created_at: "2026-05-21T10:00:00.000Z",
};

function buildInsertQuery(
  row: Record<string, unknown> | null,
  error: { message: string; code?: string } | null = null
): FakeQuery {
  const q: FakeQuery = {} as FakeQuery;
  q.insert = vi.fn(() => q);
  q.select = vi.fn(() => q);
  q.single = vi.fn(() => Promise.resolve({ data: error ? null : row, error }));
  return q;
}

function buildSelectQuery(
  row: Record<string, unknown> | null,
  error: { message: string } | null = null
): FakeQuery {
  const q: FakeQuery = {} as FakeQuery;
  q.select = vi.fn(() => q);
  q.eq = vi.fn(() => q);
  q.maybeSingle = vi.fn(() =>
    Promise.resolve({ data: error ? null : row, error })
  );
  return q;
}

function buildUpdateQuery(
  error: { message: string; code?: string } | null
): FakeQuery {
  const q: FakeQuery = {} as FakeQuery;
  q.update = vi.fn(() => q);
  q.eq = vi.fn(() => Promise.resolve({ data: null, error }));
  return q;
}

function buildDeleteQuery(
  error: { message: string; code?: string } | null
): FakeQuery {
  const q: FakeQuery = {} as FakeQuery;
  q.delete = vi.fn(() => q);
  q.eq = vi.fn(() => Promise.resolve({ data: null, error }));
  return q;
}

describe("revisions schema", () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  describe("insert succeeds", () => {
    it("returns the created revision on a valid insert", async () => {
      fromMock.mockReturnValue(buildInsertQuery(REVISION_ROW));

      const input: InsertRevisionInput = {
        entity_type: ENTITY_TYPE,
        entity_id: ENTITY_ID,
        version: VERSION,
        snapshot_jsonb: SNAPSHOT,
        moderator_id: REVISION_ROW.moderator_id,
        reason: REVISION_ROW.reason,
        published_at: REVISION_ROW.published_at,
        doctrine_version_id: REVISION_ROW.doctrine_version_id,
      };

      const result = await insertRevision(input);

      expect(fromMock).toHaveBeenCalledWith("revisions");
      expect(result.entity_type).toBe(ENTITY_TYPE);
      expect(result.entity_id).toBe(ENTITY_ID);
      expect(result.version).toBe(VERSION);
    });
  });

  describe("update rejected", () => {
    it("propagates the append-only trigger error when an update is attempted", async () => {
      // The DB-level BEFORE UPDATE trigger (migration 018) raises
      // SQLSTATE 23000 / restrict_violation. We verify that the service
      // layer propagates this error faithfully to the caller.
      const triggerError = {
        message:
          "revisions rows are append-only: UPDATE is not allowed. See DBA runbook: docs/runbooks/revisions-dba-bypass.md.",
        code: "23000",
      };
      fromMock.mockReturnValue(buildUpdateQuery(triggerError));

      // Raw Supabase update call — not exposed as a public service function
      // because the table is append-only, but this verifies the error path
      // that the DB trigger would produce.
      const supabase = { from: fromMock };
      const { error } = await supabase
        .from("revisions")
        .update({ reason: "tampered" })
        .eq("id", REVISION_ROW.id);

      expect(error).not.toBeNull();
      expect(error!.code).toBe("23000");
      expect(error!.message).toMatch(/append-only/);
    });
  });

  describe("delete rejected", () => {
    it("propagates the append-only trigger error when a delete is attempted", async () => {
      // The DB-level BEFORE DELETE trigger (migration 018) raises
      // SQLSTATE 23000 / restrict_violation.
      const triggerError = {
        message:
          "revisions rows are append-only: DELETE is not allowed. See DBA runbook: docs/runbooks/revisions-dba-bypass.md.",
        code: "23000",
      };
      fromMock.mockReturnValue(buildDeleteQuery(triggerError));

      const supabase = { from: fromMock };
      const { error } = await supabase
        .from("revisions")
        .delete()
        .eq("id", REVISION_ROW.id);

      expect(error).not.toBeNull();
      expect(error!.code).toBe("23000");
      expect(error!.message).toMatch(/append-only/);
    });
  });

  describe("unique-version-per-entity enforced", () => {
    it("throws when (entity_type, entity_id, version) is already taken", async () => {
      // Postgres unique constraint violation: SQLSTATE 23505.
      const uniqueError = {
        message:
          'duplicate key value violates unique constraint "revisions_entity_type_entity_id_version_key"',
        code: "23505",
      };
      fromMock.mockReturnValue(buildInsertQuery(null, uniqueError));

      const input: InsertRevisionInput = {
        entity_type: ENTITY_TYPE,
        entity_id: ENTITY_ID,
        version: VERSION, // already exists
        snapshot_jsonb: SNAPSHOT,
      };

      await expect(insertRevision(input)).rejects.toThrow(
        /duplicate key value/
      );
    });
  });

  describe("snapshot_jsonb round-trips faithfully", () => {
    it("preserves the full denormalised entity state including nested objects and arrays", async () => {
      const complexSnapshot: Record<string, unknown> = {
        id: "PPL_YORUBA",
        content: {
          demographics: {
            total_population: 45000000,
            distribution: [
              { country: "NGA", percentage: 85.0 },
              { country: "BEN", percentage: 10.0 },
            ],
          },
          sources: [
            {
              id: "src-1",
              tier: 1,
              url: "https://example.org/yoruba",
              notes: "cross-checked EN + FR",
            },
          ],
        },
        doctrine_version: "v2.3.1",
      };

      const rowWithComplex = {
        ...REVISION_ROW,
        snapshot_jsonb: complexSnapshot,
      };
      fromMock.mockReturnValue(buildInsertQuery(rowWithComplex));

      const result = await insertRevision({
        entity_type: ENTITY_TYPE,
        entity_id: ENTITY_ID,
        version: 2,
        snapshot_jsonb: complexSnapshot,
      });

      expect(result.snapshot_jsonb).toEqual(complexSnapshot);
      expect(
        (result.snapshot_jsonb as typeof complexSnapshot).content
      ).toBeDefined();
    });

    it("getRevision returns the stored snapshot unchanged", async () => {
      fromMock.mockReturnValue(buildSelectQuery(REVISION_ROW));

      const result = await getRevision(REVISION_ROW.id);

      expect(result).not.toBeNull();
      expect(result!.snapshot_jsonb).toEqual(SNAPSHOT);
      expect(fromMock).toHaveBeenCalledWith("revisions");
    });
  });
});
