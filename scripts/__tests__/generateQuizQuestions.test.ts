import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/036_quiz_engine.sql"),
  "utf8"
);

const stimulusMigration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/046_quiz_stimulus.sql"),
  "utf8"
);

const indexMigration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/047_quiz_bank_indexes.sql"),
  "utf8"
);

describe("036_quiz_engine.sql schema contract (generateQuizQuestions compile target)", () => {
  // @req REQ-080
  it("declares the quiz_audience enum idempotently with the five MVP segments", () => {
    expect(migration).toContain("create type quiz_audience as enum");
    expect(migration).toContain(
      "('children','teens','adults','university','professionals')"
    );
    expect(migration).toContain("exception when duplicate_object then null");
  });

  // @req REQ-080
  it("declares quiz_generation_runs with the audit-run columns", () => {
    expect(migration).toContain(
      "create table if not exists quiz_generation_runs"
    );
    expect(migration).toContain(
      "id                 uuid primary key default gen_random_uuid()"
    );
    expect(migration).toContain(
      "ran_at             timestamptz not null default now()"
    );
    expect(migration).toContain("confidence_threshold smallint not null");
    expect(migration).toContain(
      "questions_generated  integer not null default 0"
    );
    expect(migration).toContain(
      "questions_revoked    integer not null default 0"
    );
    expect(migration).toContain(
      "candidates_rejected  integer not null default 0"
    );
    expect(migration).toContain("notes              text");
  });

  // @req REQ-080
  it("declares quiz_questions with the Module 0 TEXT entity_type convention and assertions reuse", () => {
    expect(migration).toContain("create table if not exists quiz_questions");
    expect(migration).toContain("template_id         text not null");
    expect(migration).toContain("audience            quiz_audience not null");
    expect(migration).toContain(
      "difficulty          smallint not null check (difficulty between 1 and 5)"
    );
    expect(migration).toContain("entity_type         text not null");
    expect(migration).toContain("entity_id           text not null");
    expect(migration).toContain("field_path          text not null");
    expect(migration).toContain("prompt_fr           text not null");
    expect(migration).toContain("options_fr          jsonb not null");
    expect(migration).toContain(
      "correct_option      smallint not null check (correct_option between 0 and 3)"
    );
    expect(migration).toContain("explanation_fr      text not null");
    expect(migration).toContain(
      "assertion_id        uuid not null references assertions(id)"
    );
    expect(migration).toContain("source_ids          uuid[] not null");
    expect(migration).toContain("confidence_at_generation smallint not null");
    expect(migration).toContain(
      "generation_run_id   uuid not null references quiz_generation_runs(id)"
    );
    expect(migration).toContain(
      "generated_at        timestamptz not null default now()"
    );
    expect(migration).toContain("revoked_at          timestamptz");
    expect(migration).toContain("revoked_reason      text");
  });

  // @req REQ-080
  it("declares the partial serving index and the entity lookup index", () => {
    expect(migration).toContain(
      "create index if not exists idx_quiz_questions_serving"
    );
    expect(migration).toContain("on quiz_questions (audience, difficulty)");
    expect(migration).toContain("where revoked_at is null");
    expect(migration).toContain(
      "create index if not exists idx_quiz_questions_entity"
    );
    expect(migration).toContain("on quiz_questions (entity_type, entity_id)");
  });

  // @req REQ-080
  it("enables RLS with public-read policies and no anon/authenticated write policies", () => {
    expect(migration).toContain(
      "alter table quiz_questions enable row level security"
    );
    expect(migration).toContain(
      "alter table quiz_generation_runs enable row level security"
    );
    expect(migration).toContain(
      "drop policy if exists quiz_questions_public_read on quiz_questions"
    );
    expect(migration).toContain("for select using (revoked_at is null)");
    expect(migration).toContain(
      "drop policy if exists quiz_runs_public_read on quiz_generation_runs"
    );
    expect(migration).toContain("for select using (true)");
    expect(migration).not.toContain("for insert");
    expect(migration).not.toContain("for update");
    expect(migration).not.toContain("for delete");
  });

  // @req REQ-080
  it("reuses Module 0 assertions and TEXT entity_type with no competing definitions", () => {
    expect(migration).not.toContain("create table if not exists assertions");
    expect(migration).not.toContain("create type entity_type");
    expect(migration.toLowerCase()).not.toContain("entity_type as enum");
  });
});

describe("046_quiz_stimulus.sql schema contract", () => {
  /**
   * The inversion templates persist a fragment per question, so the column has
   * to exist before a sweep writes one. Asserted here for the same reason as
   * 036 above: `insertQuestions` names the column literally, and a rename that
   * only touched the SQL would fail at runtime on the first insert.
   */
  // @req REQ-121
  it("adds a nullable stimulus_fr to quiz_questions", () => {
    expect(stimulusMigration).toContain("alter table quiz_questions");
    expect(stimulusMigration).toContain(
      "add column if not exists stimulus_fr text"
    );
  });

  /**
   * Nullable, and no default. T1-T5 and T12 name their subject in the stem and
   * set nothing up; a `not null default ''` would make every one of them carry
   * an empty stimulus the card would have to test for anyway.
   */
  // @req REQ-121
  it("leaves the column nullable so the templates without a stimulus carry none", () => {
    expect(stimulusMigration).not.toContain("not null");
    expect(stimulusMigration).not.toContain("default ''");
  });

  // @req REQ-121
  it("changes nothing else about the bank", () => {
    expect(stimulusMigration).not.toContain("drop column");
    expect(stimulusMigration).not.toContain("create table");
    expect(stimulusMigration).not.toContain("create policy");
  });
});

describe("047_quiz_bank_indexes.sql schema contract", () => {
  /**
   * The identity rule — one active question per (entity, template) — lived in
   * memory only, inside `computeSweepPlan`. Two concurrent sweeps would have
   * inserted the same question twice with nothing to stop them.
   */
  // @req REQ-121
  it("gives the bank's identity rule a constraint rather than a convention", () => {
    expect(indexMigration).toContain(
      "create unique index if not exists uq_quiz_questions_active_identity"
    );
    expect(indexMigration).toContain(
      "on quiz_questions (entity_id, template_id)"
    );
    expect(indexMigration).toContain("where revoked_at is null");
  });

  /**
   * `(audience, difficulty)` leads on a column that has held one value since
   * the audience axis was retired, so it discriminates nothing.
   */
  // @req REQ-121
  it("drops the index keyed on the retired audience axis", () => {
    expect(indexMigration).toContain(
      "drop index if exists idx_quiz_questions_serving"
    );
  });

  // @req REQ-121
  it("indexes the bank by subject, now that a subject can be a country", () => {
    expect(indexMigration).toContain(
      "on quiz_questions (entity_type, entity_id, template_id)"
    );
  });
});
