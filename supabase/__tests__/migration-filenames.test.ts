import { readdirSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const migrationsDirectory = path.resolve(__dirname, "../migrations");
const migrationFiles = readdirSync(migrationsDirectory)
  .filter((file) => file.endsWith(".sql"))
  .sort();

describe("Supabase migration filenames", () => {
  // @req REQ-085
  it("uses unique, contiguous three-digit versions", () => {
    const versions = migrationFiles.map((file) => {
      const match = file.match(/^(\d{3})_[a-z0-9_]+\.sql$/);

      expect(file, "migration filenames must use NNN_name.sql").toMatch(
        /^(\d{3})_[a-z0-9_]+\.sql$/
      );

      return match?.[1];
    });

    const expectedVersions = migrationFiles.map((_, index) =>
      String(index + 1).padStart(3, "0")
    );

    expect(versions).toEqual(expectedVersions);
  });
});
