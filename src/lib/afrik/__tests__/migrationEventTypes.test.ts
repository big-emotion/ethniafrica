import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { MIGRATION_EVENT_TYPES } from "../migrationEventTypes";

/**
 * Story 12.1 — lockstep test: the TS union MIGRATION_EVENT_TYPES must always
 * equal `_meta.eventTypeEnum` in public/modele-migration.json, so extending
 * the open enum (Extension contract, Epic 13) fails CI until both are updated.
 */
describe("migrationEventTypes lockstep with public/modele-migration.json", () => {
  // @req REQ-080
  it("TS union matches the model file's _meta.eventTypeEnum", () => {
    const modelPath = path.join(
      __dirname,
      "../../../../public/modele-migration.json"
    );
    const model = JSON.parse(fs.readFileSync(modelPath, "utf-8")) as {
      _meta?: { eventTypeEnum?: string[] };
    };

    const modelEnum = [...(model._meta?.eventTypeEnum ?? [])].sort();
    const tsUnion = [...MIGRATION_EVENT_TYPES].sort();

    expect(tsUnion).toEqual(modelEnum);
  });
});
