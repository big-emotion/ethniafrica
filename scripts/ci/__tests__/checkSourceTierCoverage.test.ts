import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  NEEDS_REVIEW_RATCHET,
  checkSourceTierCoverage,
  findUntieredSources,
} from "../checkSourceTierCoverage";

let datasetRoot: string;

function writeFiche(relativePath: string, fiche: unknown): void {
  const filePath = path.join(datasetRoot, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(fiche, null, 2), "utf8");
}

beforeEach(() => {
  datasetRoot = fs.mkdtempSync(path.join(os.tmpdir(), "tier-coverage-"));
});

afterEach(() => {
  fs.rmSync(datasetRoot, { recursive: true, force: true });
});

describe("findUntieredSources", () => {
  // @req REQ-032
  it("reports a source left at needs_review", () => {
    writeFiche("peuples/PPL_A.json", {
      id: "PPL_A",
      content: {
        sources: [
          { title: "Recensements", url: null, tier: "needs_review", notes: "" },
        ],
      },
    });

    const untiered = findUntieredSources(datasetRoot);

    expect(untiered).toHaveLength(1);
    expect(untiered[0].path).toBe("content.sources[0]");
    expect(untiered[0].title).toBe("Recensements");
  });

  // @req REQ-032
  it("reports a source with no tier field at all", () => {
    writeFiche("pays/ZAF.json", {
      id: "ZAF",
      content: { sources: [{ title: "Statistics South Africa", url: null }] },
    });

    expect(findUntieredSources(datasetRoot)).toHaveLength(1);
  });

  // @req REQ-032
  it("accepts the three doctrine tiers and the legacy numeric tiers", () => {
    writeFiche("relations/REL_A.json", {
      id: "REL_A",
      sources: [
        { title: "a", tier: "official" },
        { title: "b", tier: "referenced" },
        { title: "c", tier: "unverified" },
        { title: "d", tier: 1 },
        { title: "e", tier: 2 },
      ],
    });

    expect(findUntieredSources(datasetRoot)).toHaveLength(0);
  });

  // @req REQ-032
  it("looks inside nested sources arrays such as names[].sources", () => {
    writeFiche("noms/PPL_A.json", {
      id: "PPL_A",
      names: [{ nameText: "x", sources: [{ title: "y" }] }],
    });

    expect(findUntieredSources(datasetRoot)[0].path).toBe(
      "names[0].sources[0]"
    );
  });
});

describe("checkSourceTierCoverage", () => {
  // @req REQ-032
  it("fails when the untiered count exceeds the threshold", () => {
    writeFiche("peuples/PPL_A.json", {
      id: "PPL_A",
      content: {
        sources: [{ title: "a", tier: "needs_review" }, { title: "b" }],
      },
    });

    const result = checkSourceTierCoverage(datasetRoot, 1);

    expect(result.ok).toBe(false);
    expect(result.count).toBe(2);
  });

  // @req REQ-032
  it("passes when the untiered count sits on the threshold", () => {
    writeFiche("peuples/PPL_A.json", {
      id: "PPL_A",
      content: { sources: [{ title: "a", tier: "needs_review" }] },
    });

    expect(checkSourceTierCoverage(datasetRoot, 1).ok).toBe(true);
  });

  // @req REQ-032
  it("holds the live corpus at or below the committed ratchet", () => {
    const live = checkSourceTierCoverage(
      "dataset/source/afrik",
      NEEDS_REVIEW_RATCHET
    );

    expect(live.ok).toBe(true);
    expect(live.count).toBeLessThanOrEqual(NEEDS_REVIEW_RATCHET);
  });
});
