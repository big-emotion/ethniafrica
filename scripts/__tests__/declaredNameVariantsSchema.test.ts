import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import * as nameTypes from "@/types/names";
import type { NameRecordDossier } from "@/types/names";

const namesAtlasMigration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/029_names_atlas.sql"),
  "utf8"
);
const patronymeMigration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/053_name_table.sql"),
  "utf8"
);

describe("declared name-variant schema contract", () => {
  // @req REQ-135
  it("keeps name-record targets polymorphic and declares patronymes as the PAT_ target", () => {
    const nameRecordsDefinition = namesAtlasMigration.match(
      /CREATE TABLE IF NOT EXISTS name_records\s*\(([\s\S]*?)\n\);/
    )?.[1];

    expect(nameRecordsDefinition).toContain(
      "entity_type TEXT NOT NULL DEFAULT 'people'"
    );
    expect(nameRecordsDefinition).not.toMatch(/CHECK\s*\(\s*entity_type\b/i);
    expect(namesAtlasMigration).not.toMatch(
      /CREATE TYPE\s+(?:name_record_)?entity_type\b/i
    );

    expect(patronymeMigration).toContain(
      "CREATE TABLE IF NOT EXISTS afrik_patronymes"
    );
    expect(patronymeMigration).toContain(
      "id TEXT PRIMARY KEY CHECK (id ~ '^PAT_[A-Z0-9_]+$')"
    );

    const contract = nameTypes as unknown as {
      NAME_RECORD_ENTITY_TYPES?: readonly string[];
    };
    expect(contract.NAME_RECORD_ENTITY_TYPES).toEqual(["people", "patronyme"]);

    const patronymeDossier = {
      id: "PAT_TEST",
      entityType: "patronyme",
      names: [],
    } satisfies NameRecordDossier;
    expect(patronymeDossier.id).toMatch(/^PAT_/);
  });
});
