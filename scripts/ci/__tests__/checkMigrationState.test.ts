import { describe, it, expect } from "vitest";

import {
  fetchLedger,
  formatReport,
  LedgerUnavailableError,
} from "../checkMigrationState";
import { reconcileMigrations } from "../../lib/migrationLedger";

const okResponse = (body: unknown) =>
  ({
    ok: true,
    status: 200,
    json: async () => body,
    text: async () => JSON.stringify(body),
  }) as unknown as Response;

const errorResponse = (status: number, body: string) =>
  ({
    ok: false,
    status,
    json: async () => JSON.parse(body),
    text: async () => body,
  }) as unknown as Response;

describe("fetchLedger", () => {
  // @req REQ-032
  it("posts to the RPC with the service-role key on both headers PostgREST checks", async () => {
    let seen: { url: string; init: RequestInit } | null = null;
    const fetchImpl = (async (url: string, init: RequestInit) => {
      seen = { url, init };
      return okResponse([]);
    }) as unknown as typeof fetch;

    await fetchLedger("https://db.example.co/", "service-key", fetchImpl);

    expect(seen!.url).toBe(
      "https://db.example.co/rest/v1/rpc/applied_migrations"
    );
    expect(seen!.init.method).toBe("POST");
    const headers = seen!.init.headers as Record<string, string>;
    expect(headers.apikey).toBe("service-key");
    expect(headers.Authorization).toBe("Bearer service-key");
  });

  // @req REQ-032
  it("reads a row whose statements column came back null as having none", async () => {
    const fetchImpl = (async () =>
      okResponse([
        { version: "001", name: "initial_schema", statements: null },
      ])) as unknown as typeof fetch;

    const ledger = await fetchLedger("https://db.example.co", "key", fetchImpl);

    expect(ledger).toEqual([
      { version: "001", name: "initial_schema", statements: [] },
    ]);
  });

  // The likeliest failure on a fresh database is that 042 itself is not applied,
  // and a bare "HTTP 404" sends the reader looking in the wrong place.
  // @req REQ-032
  it("names the unapplied introspection migration when PostgREST cannot find the function", async () => {
    const fetchImpl = (async () =>
      errorResponse(
        404,
        '{"code":"PGRST202","message":"Could not find the function"}'
      )) as unknown as typeof fetch;

    await expect(
      fetchLedger("https://db.example.co", "key", fetchImpl)
    ).rejects.toThrow(/042_migration_ledger_introspection\.sql is not applied/);
  });

  // @req REQ-032
  it("raises a typed error on any other HTTP failure rather than returning an empty ledger", async () => {
    const fetchImpl = (async () =>
      errorResponse(401, "invalid api key")) as unknown as typeof fetch;

    await expect(
      fetchLedger("https://db.example.co", "key", fetchImpl)
    ).rejects.toBeInstanceOf(LedgerUnavailableError);
  });
});

describe("formatReport", () => {
  const file = (version: string, name: string) => ({
    version,
    name,
    filename: `${version}_${name}.sql`,
    sql: "SELECT 1;",
  });

  // @req REQ-032
  it("names every pending file, so the reader knows what to apply", () => {
    const report = formatReport(
      reconcileMigrations([file("040", "assertion_references_rls")], []),
      "db.example.co"
    );

    expect(report).toContain("PENDING");
    expect(report).toContain("040_assertion_references_rls.sql");
    expect(report).toContain("disagree");
  });

  // @req REQ-032
  it("says the state is OK only when nothing is pending, orphaned or drifted", () => {
    const report = formatReport(
      reconcileMigrations(
        [file("001", "initial_schema")],
        [{ version: "001", name: "initial_schema", statements: ["SELECT 1;"] }]
      ),
      "db.example.co"
    );

    expect(report).toContain("check:migration-state — OK");
  });

  // @req REQ-032
  it("reports pre-statement history as a note, not as a failure", () => {
    const result = reconcileMigrations(
      [file("001", "initial_schema")],
      [{ version: "001", name: "initial_schema", statements: [] }]
    );

    expect(result.isClean).toBe(true);
    expect(formatReport(result, "db.example.co")).toContain("NOTE");
  });
});
