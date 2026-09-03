import { describe, expect, it } from "vitest";

import {
  auditEnvExample,
  collectDocumented,
  collectReferences,
} from "../checkEnvExample";

describe("collectReferences", () => {
  // @req REQ-032
  it("finds a plain process.env read", () => {
    expect(
      collectReferences([{ path: "a.ts", source: "process.env.FOO" }])
    ).toEqual(new Set(["FOO"]));
  });

  // @req REQ-032
  it("ignores a lower-case property, which is not an env var by convention", () => {
    expect(
      collectReferences([{ path: "a.ts", source: "process.envelope.thing" }])
    ).toEqual(new Set());
  });
});

describe("collectDocumented", () => {
  // @req REQ-032
  it("reads assignment keys and skips comments and blank lines", () => {
    const documented = collectDocumented(
      ["# a comment", "", "FOO=bar", "BAZ=", "# QUX=commented-out"].join("\n")
    );
    expect(documented).toEqual(new Set(["FOO", "BAZ"]));
  });
});

describe("auditEnvExample", () => {
  // @req REQ-032
  it("reports a variable read in code but absent from the file", () => {
    const result = auditEnvExample({
      referenced: new Set(["DOCUMENTED", "FORGOTTEN"]),
      documented: new Set(["DOCUMENTED"]),
    });

    expect(result.undocumented).toEqual(["FORGOTTEN"]);
    expect(result.ok).toBe(false);
  });

  // The direction that was missing. Nothing read USE_SUPABASE for months and it
  // sat in the file the whole time, because the check only ever looked one way.
  // @req REQ-032
  it("reports a variable documented in the file but read nowhere", () => {
    const result = auditEnvExample({
      referenced: new Set(["ALIVE"]),
      documented: new Set(["ALIVE", "LEFTOVER"]),
    });

    expect(result.unread).toEqual(["LEFTOVER"]);
    expect(result.ok).toBe(false);
  });

  // Runtime-supplied variables are read but never ours to document.
  // @req REQ-032
  it("does not ask for the platform's own variables to be documented", () => {
    const result = auditEnvExample({
      referenced: new Set(["NODE_ENV", "CI", "VERCEL", "VERCEL_URL"]),
      documented: new Set(),
    });

    expect(result.undocumented).toEqual([]);
    expect(result.ok).toBe(true);
  });

  // An unread entry can be deliberate — the Turnstile site key documents a gap
  // rather than a value. The exception has to be declared, not silent.
  // @req REQ-032
  it("accepts an unread entry only when it is on the declared exception list", () => {
    const result = auditEnvExample({
      referenced: new Set(["ALIVE"]),
      documented: new Set(["ALIVE", "CLOUDFLARE_TURNSTILE_SITE_KEY"]),
    });

    expect(result.unread).toEqual([]);
    expect(result.ok).toBe(true);
  });

  // The two directions do not share a scope. A variable only a test reads is not
  // a deployment requirement, so it must not be demanded — but documenting it is
  // legitimate, so it must not be reported as dead either. The RLS suites'
  // TEST_SUPABASE_* entries are exactly this case.
  // @req REQ-032
  it("does not demand documentation for a name only a test mentions", () => {
    const result = auditEnvExample({
      referenced: new Set(),
      referencedIncludingTests: new Set(["ONLY_IN_A_FIXTURE"]),
      documented: new Set(),
    });

    expect(result.undocumented).toEqual([]);
    expect(result.ok).toBe(true);
  });

  // @req REQ-032
  it("counts a test-only read as justifying its documented entry", () => {
    const result = auditEnvExample({
      referenced: new Set(),
      referencedIncludingTests: new Set(["TEST_SUPABASE_URL"]),
      documented: new Set(["TEST_SUPABASE_URL"]),
    });

    expect(result.unread).toEqual([]);
    expect(result.ok).toBe(true);
  });

  // @req REQ-032
  it("is ok when both directions agree", () => {
    const result = auditEnvExample({
      referenced: new Set(["A", "B"]),
      documented: new Set(["A", "B"]),
    });

    expect(result).toMatchObject({ ok: true, undocumented: [], unread: [] });
  });
});
