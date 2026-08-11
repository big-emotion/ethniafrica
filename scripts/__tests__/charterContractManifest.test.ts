import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CHARTER_CONTRACT_EXTRA_FILES,
  charterContractFiles,
  discoverCharterNamedTests,
} from "../charterContractManifest";

// The 13 files ETNI-982 (FR110) named as the scattered charter contract
// suite to aggregate. A literal list here is a regression guard: if the
// manifest ever silently drops one of these, this test catches it even
// though `discoverCharterNamedTests()` would independently re-find the
// charter-named ones on its own.
const KNOWN_CHARTER_CONTRACT_FILES = [
  "src/lib/__tests__/charterTokens.test.ts",
  "src/lib/__tests__/nightTokens.test.ts",
  "src/app/__tests__/systemStatesCharter.test.tsx",
  "src/components/ui/__tests__/charterPrimitives.test.tsx",
  "src/components/home/__tests__/DottedContinent.test.tsx",
  "src/components/__tests__/SearchModalV2.test.tsx",
  "src/components/__tests__/moderationCharter.test.tsx",
  "src/components/views/__tests__/directoryCharter.test.tsx",
  "src/components/forms/__tests__/formsCharter.test.tsx",
  "src/components/__tests__/searchCharter.test.tsx",
  "src/components/fiche/__tests__/FichePanel.test.tsx",
  "src/components/pages/__tests__/editorialCharter.test.tsx",
  "scripts/__tests__/qualityGateRoutes.test.ts",
] as const;

describe("charter contract manifest (ETNI-982)", () => {
  // @req REQ-091
  it("includes every one of the 12 charter contract files plus qualityGateRoutes.test.ts", () => {
    const files = charterContractFiles();
    for (const known of KNOWN_CHARTER_CONTRACT_FILES) {
      expect(files, `${known} must be part of the aggregate suite`).toContain(
        known
      );
    }
  });

  // @req REQ-091
  it("auto-discovers every *charter*-named test file so new ones aren't silently excluded", () => {
    const discovered = discoverCharterNamedTests();
    const aggregate = charterContractFiles();

    expect(discovered.length).toBeGreaterThan(0);
    for (const file of discovered) {
      expect(
        aggregate,
        `${file} matches the charter naming convention and must be discoverable`
      ).toContain(file);
    }
  });

  // @req REQ-091
  it("documents why each non-charter-named extra file belongs in the suite, and that it exists", () => {
    expect(CHARTER_CONTRACT_EXTRA_FILES.length).toBeGreaterThan(0);
    for (const file of CHARTER_CONTRACT_EXTRA_FILES) {
      expect(existsSync(join(process.cwd(), file)), `${file} must exist`).toBe(
        true
      );
    }
  });

  // @req REQ-091
  it("has no duplicate entries", () => {
    const files = charterContractFiles();
    expect(new Set(files).size).toBe(files.length);
  });
});
