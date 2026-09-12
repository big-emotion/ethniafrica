import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

const stylesheet = readFileSync(
  join(process.cwd(), "src/styles/fiche-parchment.css"),
  "utf8"
);

describe("REQ-152 fiche chapter rhythm", () => {
  // @req REQ-152
  test("the parchment consumes the section-gap token without changing chapter padding", () => {
    expect(stylesheet).toMatch(/--afh-section-gap/);
    expect(stylesheet).toMatch(
      /\.afh-parchment-section\s*\{[^}]*padding:\s*26px 20px;/
    );
    expect(stylesheet).toMatch(
      /\.afh-parchment-section\s*\{[^}]*padding:\s*34px 40px;/
    );
  });
});
