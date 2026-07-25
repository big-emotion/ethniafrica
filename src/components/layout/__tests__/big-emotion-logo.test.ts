import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("BIG EMOTION logo", () => {
  // @req REQ-088
  it("uses the EthniAfrica logo palette", () => {
    const logo = readFileSync(
      join(process.cwd(), "public/brand/big-emotion.svg"),
      "utf8"
    ).toLowerCase();

    expect(logo).toContain("#55d47b");
    expect(logo).toContain("#ff9c20");
    expect(logo).toContain("#f54432");
    expect(logo).toContain("#4677d5");
    expect(logo).not.toContain("#101515");
  });
});
