import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/086_flag_reporter_locale.sql"),
  "utf8"
).toLowerCase();

describe("086_flag_reporter_locale.sql migration contract", () => {
  // @req REQ-145
  it("stores a constrained reporter locale and keeps existing rows French", () => {
    expect(migration).toContain("alter table flag_reporter_contacts");
    expect(migration).toContain("add column if not exists locale");
    expect(migration).toContain("default 'fr'");
    expect(migration).toContain("not null");
    expect(migration).toMatch(/locale\s+in\s*\(\s*'en'\s*,\s*'fr'\s*\)/);
  });
});
