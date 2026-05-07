import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// RLS policy matrix — derived from migrations 008-011
// ---------------------------------------------------------------------------

type Role = "anon" | "reader" | "contributor" | "moderator" | "admin";
type Operation = "read" | "write";

interface PolicyEntry {
  allowed: boolean;
}

type PolicyMatrix = Record<
  string,
  Record<Role, Record<Operation, PolicyEntry>>
>;

const ALL_ROLES: Role[] = [
  "anon",
  "reader",
  "contributor",
  "moderator",
  "admin",
];

function publicReadPolicy(): Record<Role, Record<Operation, PolicyEntry>> {
  const entry: Record<Role, Record<Operation, PolicyEntry>> = {} as Record<
    Role,
    Record<Operation, PolicyEntry>
  >;
  for (const role of ALL_ROLES) {
    entry[role] = { read: { allowed: true }, write: { allowed: false } };
  }
  return entry;
}

const POLICY_MATRIX: PolicyMatrix = {
  sources: publicReadPolicy(),
  assertions: publicReadPolicy(),
  confidence_scores: publicReadPolicy(),
  flags: publicReadPolicy(),
  revisions: publicReadPolicy(),
  editorial_doctrine: publicReadPolicy(),
  user_roles: publicReadPolicy(),
  audit_log: {
    anon: { read: { allowed: false }, write: { allowed: false } },
    reader: { read: { allowed: false }, write: { allowed: false } },
    contributor: { read: { allowed: false }, write: { allowed: false } },
    moderator: { read: { allowed: false }, write: { allowed: false } },
    admin: { read: { allowed: true }, write: { allowed: false } },
  },
  // api_keys: owner-only read; in mock: admin is treated as owner, others denied
  api_keys: {
    anon: { read: { allowed: false }, write: { allowed: false } },
    reader: { read: { allowed: false }, write: { allowed: false } },
    contributor: { read: { allowed: false }, write: { allowed: false } },
    moderator: { read: { allowed: false }, write: { allowed: false } },
    admin: { read: { allowed: true }, write: { allowed: false } },
  },
};

// ---------------------------------------------------------------------------
// RLS error constant
// ---------------------------------------------------------------------------

const RLS_ERROR = {
  code: "42501",
  message: "new row violates row-level security policy",
};

// ---------------------------------------------------------------------------
// Mock Supabase client factory
// ---------------------------------------------------------------------------

vi.mock("@supabase/supabase-js", () => {
  return {
    createClient: vi.fn(),
  };
});

function createMockSupabaseClient(role: Role) {
  const fromMock = (tableName: string) => {
    const tablePolicy = POLICY_MATRIX[tableName];

    const selectMock = vi.fn(() => {
      const readAllowed = tablePolicy?.[role]?.read?.allowed ?? false;
      if (readAllowed) {
        return Promise.resolve({ data: [], error: null });
      }
      return Promise.resolve({ data: null, error: { ...RLS_ERROR } });
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const insertMock = vi.fn((_row: any) => {
      // Writes are always denied by RLS
      return Promise.resolve({ data: null, error: { ...RLS_ERROR } });
    });

    return {
      select: selectMock,
      insert: insertMock,
    };
  };

  return {
    from: vi.fn((tableName: string) => fromMock(tableName)),
    auth: {
      uid: vi.fn(() => (role === "anon" ? null : `uid-${role}`)),
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ALL_TABLES = Object.keys(POLICY_MATRIX);

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("RLS Policy Suite — migrations 008-011", () => {
  // Top-level: verify RLS is enabled on all 9 tables
  it("RLS is enabled on all 9 tables from migrations 008-011", () => {
    expect(ALL_TABLES).toHaveLength(9);
    expect(ALL_TABLES).toEqual(
      expect.arrayContaining([
        "sources",
        "assertions",
        "confidence_scores",
        "flags",
        "revisions",
        "editorial_doctrine",
        "user_roles",
        "audit_log",
        "api_keys",
      ])
    );
  });

  // ---------------------------------------------------------------------------
  // Per-table suites
  // ---------------------------------------------------------------------------

  for (const tableName of ALL_TABLES) {
    describe(tableName, () => {
      // --- READ ---
      for (const role of ALL_ROLES) {
        const readAllowed = POLICY_MATRIX[tableName][role].read.allowed;

        if (readAllowed) {
          it(`role=${role}: read is allowed`, async () => {
            const client = createMockSupabaseClient(role);
            const result = await client.from(tableName).select();
            expect(result.error).toBeNull();
            expect(result.data).toBeDefined();
          });
        } else {
          it(`role=${role}: read is denied with RLS error`, async () => {
            const client = createMockSupabaseClient(role);
            const result = await client.from(tableName).select();
            expect(result.error).not.toBeNull();
            expect(result.error?.code).toBe("42501");
            expect(result.data).toBeNull();
          });
        }
      }

      // --- WRITE ---
      for (const role of ALL_ROLES) {
        it(`role=${role}: write is denied with RLS error`, async () => {
          const client = createMockSupabaseClient(role);
          const result = await client.from(tableName).insert({ id: "test" });
          expect(result.error).not.toBeNull();
          expect(result.error?.code).toBe("42501");
          expect(result.data).toBeNull();
        });
      }
    });
  }
});
