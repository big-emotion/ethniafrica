import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const workflow = fs.readFileSync(
  path.join(process.cwd(), ".github/workflows/deploy-production.yml"),
  "utf8"
);

describe("production locale smoke gate", () => {
  // A /fr-only health probe stayed green while the root silently became
  // English. The release gate must inspect all three publication boundaries.
  // @req REQ-140
  it.each(["/", "/fr", "/en"])(
    "probes %s without following redirects",
    (path) => {
      expect(workflow).toContain(`path: "${path}"`);
      expect(workflow).toContain('redirect: "manual"');
    }
  );

  // @req REQ-140
  it("validates SITE_LOCALE_MODE before declaring the container healthy", () => {
    expect(workflow).toContain("SITE_LOCALE_MODE");
    expect(workflow).toContain("bilingual-fr-default");
    expect(workflow).toContain("bilingual-en-default");
    expect(workflow).toContain("fr-only");
  });

  // The smoke script uses top-level await and must be parsed as an ES module.
  // @req REQ-140
  it("runs the in-container smoke script as an ES module", () => {
    expect(workflow).toContain(
      "docker compose exec -T ethniafrica node --input-type=module"
    );
  });

  // A remembered English choice is ignored only while English is unpublished.
  // @req REQ-140
  it("expects the English cookie to work in either bilingual mode", () => {
    expect(workflow).toContain(
      'const rememberedEnglishPath = bilingual ? "/en" : "/fr";'
    );
    expect(workflow).toContain("location: rememberedEnglishPath");
  });
});
