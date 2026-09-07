import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/pages/AboutPageShell", () => ({
  default: ({ children }: { children: ReactNode }) => (
    <div data-testid="about-page-shell">{children}</div>
  ),
}));

vi.mock("@/components/pages/AboutPageContent", () => ({
  default: ({ language }: { language: string }) => (
    <div data-testid="about-page-content" data-language={language} />
  ),
}));

import AboutPage from "../page";

describe("AboutPage server boundary (REQ-091)", () => {
  // @req REQ-091
  it("keeps the route server-capable and delegates its interactive shell", () => {
    const source = readFileSync(
      join(process.cwd(), "src/app/[lang]/about/page.tsx"),
      "utf8"
    );

    expect(source).not.toMatch(/^["']use client["'];/m);
    expect(source).not.toMatch(/\b(?:useEffect|useParams|useLanguage)\b/);
    expect(source).toMatch(/<AboutPageShell>/);
  });

  // @req REQ-132
  it("renders About content in French inside the shell, with no data to fetch", async () => {
    render(await AboutPage({ params: Promise.resolve({ lang: "fr" }) }));

    expect(screen.getByTestId("about-page-shell")).toBeInTheDocument();
    expect(screen.getByTestId("about-page-content")).toHaveAttribute(
      "data-language",
      "fr"
    );
  });

  // @req REQ-140
  it("renders the content in the locale of the route", async () => {
    render(await AboutPage({ params: Promise.resolve({ lang: "en" }) }));

    expect(screen.getByTestId("about-page-content")).toHaveAttribute(
      "data-language",
      "en"
    );
  });
});
