import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/087_quiz_question_locale.sql"),
  "utf8"
).toLowerCase();

describe("087_quiz_question_locale.sql migration contract", () => {
  // @req REQ-145
  it("backfills French and makes active question identity locale-specific", () => {
    expect(migration).toContain("add column if not exists locale");
    expect(migration).toContain("default 'fr'");
    expect(migration).toMatch(/locale\s+in\s*\(\s*'en'\s*,\s*'fr'\s*\)/);
    expect(migration).toContain(
      "drop index if exists uq_quiz_questions_active_identity"
    );
    expect(migration).toMatch(
      /on quiz_questions\s*\(entity_id, template_id, locale\)/
    );
  });

  // @req REQ-145
  it("filters the quiz search lens by the requested locale", () => {
    expect(migration).toContain("afrik_search_quiz(");
    expect(migration).toContain("p_lang");
    expect(migration).toMatch(/qq\.locale\s*=\s*p_lang/);
  });
});
