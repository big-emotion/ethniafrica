import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("BIG EMOTION logo", () => {
  // @req REQ-088
  it("uses the EthniAfrica palette as an organic territory mosaic", () => {
    const logo = readFileSync(
      join(process.cwd(), "public/brand/big-emotion.svg"),
      "utf8"
    ).toLowerCase();

    expect(logo).toContain("#55d47b");
    expect(logo).toContain("#ff9c20");
    expect(logo).toContain("#f54432");
    expect(logo).toContain("#4677d5");
    expect(logo).not.toContain("#101515");
    expect(logo).not.toContain("<lineargradient");
    expect(logo).toContain('id="big-emotion-letterforms"');
    expect(logo.match(/class="territory"/g)).toHaveLength(12);
    expect(logo).toContain('class="letter-i" fill="#f54432"');
  });
});
