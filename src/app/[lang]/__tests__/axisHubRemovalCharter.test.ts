import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const fromRoot = (relativePath: string) => resolve(process.cwd(), relativePath);

const AXIS_HUB_PAGES = [
  "src/app/[lang]/explorer/page.tsx",
  "src/app/[lang]/comprendre/page.tsx",
  "src/app/[lang]/jouer/page.tsx",
] as const;

const REPRESENTATIVE_NESTED_PAGES = [
  "src/app/[lang]/explorer/peuples/page.tsx",
  "src/app/[lang]/comprendre/doctrine/page.tsx",
  "src/app/[lang]/jouer/[jeu]/page.tsx",
] as const;

const HUB_ONLY_RENDERERS = [
  "src/components/hubs/AccessModeHub.tsx",
  "src/components/hubs/ExplorerContinent.tsx",
  "src/components/hubs/ComprendreQuestionSpine.tsx",
  "src/components/hubs/JouerProjectionContrast.tsx",
] as const;

describe("axis hub removal charter", () => {
  // @req REQ-114
  it("removes only the three axis landing pages", () => {
    for (const hubPage of AXIS_HUB_PAGES) {
      expect(existsSync(fromRoot(hubPage)), hubPage).toBe(false);
    }

    for (const nestedPage of REPRESENTATIVE_NESTED_PAGES) {
      expect(existsSync(fromRoot(nestedPage)), nestedPage).toBe(true);
    }
  });

  // @req REQ-114
  it("removes renderers used only by the retired landing pages", () => {
    for (const renderer of HUB_ONLY_RENDERERS) {
      expect(existsSync(fromRoot(renderer)), renderer).toBe(false);
    }
  });
});
