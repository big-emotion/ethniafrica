import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("root layout font configuration", () => {
  // @req REQ-091
  it("loads Fraunces in the required weights with normal and italic styles", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/app/layout.tsx"),
      "utf8"
    );
    const frauncesConfig = source.match(
      /const fraunces = Fraunces\(\{([\s\S]*?)\n\}\);/
    );

    expect(frauncesConfig).not.toBeNull();
    expect(frauncesConfig?.[1]).toContain(
      'weight: ["300", "500", "700", "900"]'
    );
    expect(frauncesConfig?.[1]).toContain('style: ["normal", "italic"]');
  });
});
