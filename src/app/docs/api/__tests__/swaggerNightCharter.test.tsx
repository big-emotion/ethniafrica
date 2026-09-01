import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  SWAGGER_NIGHT_CLASS,
  useSwaggerNightSurface,
} from "@/app/docs/api/v2/useSwaggerNightSurface";

const { resolvedTheme } = vi.hoisted(() => ({ resolvedTheme: { value: "" } }));

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: resolvedTheme.value }),
}));

function Explorer() {
  useSwaggerNightSurface();
  return null;
}

function readSheet(): string {
  return readFileSync(
    resolve(process.cwd(), "src/styles/swagger-night.css"),
    "utf8"
  );
}

describe("the API explorer on the night surface", () => {
  // @req REQ-115
  it("hands the explorer to the vendor dark theme when the reader is on night", () => {
    resolvedTheme.value = "dark";

    render(<Explorer />);

    expect(document.documentElement).toHaveClass(SWAGGER_NIGHT_CLASS);
  });

  // @req REQ-115
  it("leaves the vendor dark theme off on parchment", () => {
    resolvedTheme.value = "light";

    render(<Explorer />);

    expect(document.documentElement).not.toHaveClass(SWAGGER_NIGHT_CLASS);
  });

  // The class lands on <html>, above this route's subtree: left behind, it
  // repaints every page the reader walks to next.
  // @req REQ-115
  it("takes the class back off the document when the reader leaves the page", () => {
    resolvedTheme.value = "dark";

    const view = render(<Explorer />);
    view.unmount();

    expect(document.documentElement).not.toHaveClass(SWAGGER_NIGHT_CLASS);
  });

  // Brand charter §5.1: the ground is the brand. The vendor dark theme is a
  // cold slate (#1c2022 / #2a2e30) and would read as a foreign block inside
  // the warm night, so the sheet re-tints it — through the semantic aliases,
  // never a literal and never an --afh-night-* primitive (§4).
  // @req REQ-115
  it("re-tints the vendor dark theme with semantic tokens and no literal", () => {
    const sheet = readSheet();

    expect(sheet).toMatch(/var\(--afh-bg\)/);
    expect(sheet).toMatch(/var\(--afh-surface\)/);
    expect(sheet).toMatch(/var\(--afh-text\)/);
    expect(sheet).toMatch(/var\(--afh-border\)/);

    const declarations = sheet.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(declarations).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(declarations).not.toMatch(/--afh-night-/);
  });

  // The re-tint has to outrank `html.dark-mode …`, so every selector carries
  // both classes and the sheet is imported after the vendor's.
  // @req REQ-115
  it("scopes the re-tint to the two classes that must both be present", () => {
    const sheet = readSheet();
    const selectors = sheet
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split("}")
      .flatMap((block) => block.split("{")[0].split(","))
      .map((selector) => selector.trim())
      .filter(Boolean);

    expect(selectors.length).toBeGreaterThan(0);
    for (const selector of selectors) {
      expect(selector).toMatch(/^html\.dark\.dark-mode\b/);
    }
  });

  // @req REQ-099
  it("loads the re-tint after the vendor stylesheet it overrides", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/app/docs/api/v2/page.tsx"),
      "utf8"
    );

    const vendor = source.indexOf('import "swagger-ui-react/swagger-ui.css";');
    const retint = source.indexOf('import "@/styles/swagger-night.css";');

    expect(vendor).toBeGreaterThanOrEqual(0);
    expect(retint).toBeGreaterThan(vendor);
  });
});
