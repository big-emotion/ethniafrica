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

  // The atlas type scale puts mono on overlines, field paths and every figure
  // that has to align in a column. While --afh-font-mono had no loaded face
  // behind it, it fell through to whatever monospace the OS supplies, whose
  // metrics break a tabular-nums column and make mockup parity unreachable.
  // @req REQ-116
  it("loads JetBrains Mono and binds --afh-font-mono to it", () => {
    const layout = readFileSync(
      resolve(process.cwd(), "src/app/layout.tsx"),
      "utf8"
    );
    const monoConfig = layout.match(
      /const jetBrainsMono = JetBrains_Mono\(\{([\s\S]*?)\n\}\);/
    );

    expect(monoConfig).not.toBeNull();
    expect(monoConfig?.[1]).toContain('variable: "--font-jetbrains-mono"');
    expect(layout).toContain("jetBrainsMono.variable");

    // Loading the face is only half of it: the token has to resolve to it, or
    // every mono rule in the app keeps using the system fallback.
    const tokens = readFileSync(
      resolve(process.cwd(), "src/styles/tokens/type.css"),
      "utf8"
    );
    const monoToken = tokens.match(/--afh-font-mono:([\s\S]*?);/);
    expect(monoToken).not.toBeNull();
    expect(monoToken?.[1]).toContain("var(--font-jetbrains-mono)");
  });

  // @req REQ-047 — retire the unused legacy Inter / Playfair Display pair.
  it("requests exactly one display family and one body family from next/font/google", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/app/layout.tsx"),
      "utf8"
    );
    const importBlock = source.match(
      /import\s*\{([\s\S]*?)\}\s*from\s*"next\/font\/google";/
    );

    expect(importBlock).not.toBeNull();
    expect(importBlock?.[1]).toContain("Fraunces");
    expect(importBlock?.[1]).toContain("Nunito_Sans");
    expect(importBlock?.[1]).not.toContain("Inter");
    expect(importBlock?.[1]).not.toContain("Playfair_Display");
    expect(source).not.toContain("--font-inter");
    expect(source).not.toContain("--font-playfair");
  });
});

describe("V2 font token bindings (REQ-047)", () => {
  // @req REQ-047
  it("binds the Tailwind sans/display utilities to the V2 font variables", () => {
    const source = readFileSync(
      resolve(process.cwd(), "tailwind.config.ts"),
      "utf8"
    );

    expect(source).toContain('sans: ["var(--font-nunito-sans)"');
    expect(source).toContain('display: ["var(--font-fraunces)"');
    expect(source).not.toContain("--font-inter");
    expect(source).not.toContain("--font-playfair");
  });

  // @req REQ-047
  it("binds the base body and heading elements to the V2 font variables", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/index.css"),
      "utf8"
    );

    expect(source).not.toContain("--font-inter");
    expect(source).not.toContain("--font-playfair");

    const bodyRule = source.match(/body\s*\{([\s\S]*?)\}/);
    expect(bodyRule).not.toBeNull();
    expect(bodyRule?.[1]).toContain("var(--font-nunito-sans)");

    const headingRule = source.match(/h1,\s*h2,[\s\S]*?\{([\s\S]*?)\}/);
    expect(headingRule).not.toBeNull();
    expect(headingRule?.[1]).toContain("var(--font-fraunces)");
  });

  // @req REQ-047
  it("preloads the V2 families (not the retired pair) for Storybook", () => {
    const source = readFileSync(
      resolve(process.cwd(), ".storybook/preview.ts"),
      "utf8"
    );

    expect(source).toContain("Fraunces");
    expect(source).toContain("Nunito+Sans");
    expect(source).not.toContain("family=Inter");
    expect(source).not.toContain("Playfair");
  });
});
