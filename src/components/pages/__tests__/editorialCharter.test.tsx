import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

import { ChapterHeading } from "../ChapterHeading";
import { ReadingColumn } from "../ReadingColumn";
import { LegalDocument } from "@/components/layout/LegalDocument";
import { legalPages } from "@/lib/legal-pages";
import AboutPageContent from "../AboutPageContent";
import DoctrinePageContent from "../DoctrinePageContent";

// ---------------------------------------------------------------------------
// Shared heading-outline helpers (FR107 — H1 → H2 → H3 without skips)
// ---------------------------------------------------------------------------

function headingLevels(container: HTMLElement): number[] {
  return Array.from(container.querySelectorAll("h1,h2,h3,h4,h5,h6")).map((el) =>
    Number(el.tagName[1])
  );
}

function assertNoSkippedLevels(levels: number[]) {
  let maxSeen = 0;
  for (const level of levels) {
    if (level > maxSeen + 1) {
      throw new Error(
        `heading outline skips a level: reached h${level} after max h${maxSeen} (levels: ${levels.join(",")})`
      );
    }
    maxSeen = Math.max(maxSeen, level);
  }
}

const NO_MOTION_PATTERN = /motion-safe:|transition-|duration-\[|animate-/;

// ---------------------------------------------------------------------------
// ChapterHeading — the shared primitive
// ---------------------------------------------------------------------------

describe("ChapterHeading (chapter anatomy primitive)", () => {
  // @req REQ-091
  it("renders a top rule, an uppercase accent step label and a Fraunces H2", () => {
    const { container } = render(
      <ChapterHeading stepLabel="01 · Étape" heading="Titre du chapitre" />
    );

    const rule = container.querySelector("hr");
    expect(rule).not.toBeNull();
    expect(rule?.className).toMatch(/bg-\[var\(--accent\)\]/);

    const stepLabel = screen.getByText("01 · Étape");
    expect(stepLabel.className).toMatch(/uppercase/);

    const heading = screen.getByRole("heading", {
      level: 2,
      name: "Titre du chapitre",
    });
    expect(heading.className).toMatch(/font-afh-display/);
    expect(heading.className).toMatch(/font-black/);
  });

  // @req REQ-091
  it("renders at H3 for the long-form exception (charter §4)", () => {
    render(<ChapterHeading stepLabel="01" heading="Sous-chapitre" level={3} />);
    expect(
      screen.getByRole("heading", { level: 3, name: "Sous-chapitre" })
    ).toBeTruthy();
  });

  // @req REQ-091
  it("carries no decorative motion — chapter anatomy itself is static", () => {
    const { container } = render(
      <ChapterHeading stepLabel="01" heading="Titre" />
    );
    expect(container.innerHTML).not.toMatch(NO_MOTION_PATTERN);
  });
});

// ---------------------------------------------------------------------------
// ReadingColumn — the 72ch measure primitive
// ---------------------------------------------------------------------------

describe("ReadingColumn (72ch reading measure)", () => {
  // @req REQ-091
  it("constrains its children to the charter's reading measure", () => {
    const { container } = render(
      <ReadingColumn>
        <p>Corps de texte.</p>
      </ReadingColumn>
    );
    expect(container.firstElementChild?.className).toMatch(/max-w-\[72ch\]/);
  });
});

// ---------------------------------------------------------------------------
// Legal templates — zero motion, print-safe, chapter anatomy per section
// ---------------------------------------------------------------------------

describe("LegalDocument (legal template family)", () => {
  // @req REQ-091
  it("has a valid H1 → H2 heading outline with no skips", () => {
    const { container } = render(
      <LegalDocument document={legalPages.legalNotice} />
    );
    assertNoSkippedLevels(headingLevels(container));
  });

  // @req REQ-091
  it("gains chapter anatomy (top rule + step label) on every section", () => {
    const { container } = render(
      <LegalDocument document={legalPages.legalNotice} />
    );
    const rules = container.querySelectorAll("hr");
    expect(rules.length).toBeGreaterThanOrEqual(
      legalPages.legalNotice.sections.length
    );
  });

  // @req REQ-091
  it("keeps the reading column on section body paragraphs", () => {
    const { container } = render(
      <LegalDocument document={legalPages.legalNotice} />
    );
    expect(container.innerHTML).toMatch(/max-w-\[72ch\]/);
  });

  // @req REQ-091
  it("carries zero decorative motion and stays print-safe", () => {
    const { container } = render(
      <LegalDocument document={legalPages.legalNotice} />
    );
    expect(container.innerHTML).not.toMatch(NO_MOTION_PATTERN);
  });
});

// ---------------------------------------------------------------------------
// About — reading column + chapter anatomy, no heading-level skips
// ---------------------------------------------------------------------------

describe("AboutPageContent", () => {
  // @req REQ-091
  it("has a valid H1 → H2 → H3 heading outline with no skips", () => {
    const { container } = render(<AboutPageContent language="fr" />);
    assertNoSkippedLevels(headingLevels(container));
  });

  // @req REQ-091
  it("gains chapter anatomy on its top-level sections", () => {
    const { container } = render(<AboutPageContent language="fr" />);
    expect(container.querySelectorAll("hr").length).toBeGreaterThanOrEqual(2);
  });

  // @req REQ-091
  it("keeps the reading column on its prose content", () => {
    const { container } = render(<AboutPageContent language="fr" />);
    expect(container.innerHTML).toMatch(/max-w-\[72ch\]/);
  });
});

// ---------------------------------------------------------------------------
// Doctrine index — chapter anatomy per classification, anchors preserved
// ---------------------------------------------------------------------------

describe("DoctrinePageContent", () => {
  // @req REQ-091
  it("has a valid H1 → H2 heading outline with no skips", () => {
    const { container } = render(<DoctrinePageContent />);
    assertNoSkippedLevels(headingLevels(container));
  });

  // @req REQ-091
  it("gains chapter anatomy on every classification section", () => {
    const { container } = render(<DoctrinePageContent />);
    expect(container.querySelectorAll("hr").length).toBeGreaterThanOrEqual(4);
  });

  // @req REQ-091
  it("keeps the reading column on its prose content", () => {
    const { container } = render(<DoctrinePageContent />);
    expect(container.innerHTML).toMatch(/max-w-\[72ch\]/);
  });

  // @req REQ-091
  it("keeps the classification anchors ClassificationBadge links to", () => {
    const { container } = render(<DoctrinePageContent />);
    expect(container.querySelector("#consensual")).not.toBeNull();
    expect(container.querySelector("#contested")).not.toBeNull();
    expect(container.querySelector("#colonial-legacy")).not.toBeNull();
    expect(container.querySelector("#reconstructive")).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Doctrine article — version metadata + source notes intact after refactor
// ---------------------------------------------------------------------------

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("next-mdx-remote/rsc", () => ({
  MDXRemote: ({ source }: { source: string }) => (
    <div data-testid="mdx-remote">{source}</div>
  ),
}));

vi.mock("remark-gfm", () => ({ default: () => undefined }));

vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

const mockFetchDoctrineEntry = vi.fn();
vi.mock("@/lib/doctrine/fetchDoctrineEntry", () => ({
  fetchDoctrineEntry: (...args: unknown[]) => mockFetchDoctrineEntry(...args),
}));

describe("doctrine article page (metadata regression)", () => {
  // @req REQ-091
  it("keeps version metadata, changelog link and mdx content intact under the reading column", async () => {
    mockFetchDoctrineEntry.mockResolvedValueOnce({
      id: "uuid-1",
      slug: "classifications-contestees",
      title: "Classifications contestées",
      mdxSource: "# Classifications contestées",
      version: 1,
      publishedAt: "2026-05-14T00:00:00Z",
    });

    const DoctrineSlugPage = (
      await import("@/app/[lang]/comprendre/doctrine/[slug]/page")
    ).default;
    const ui = await DoctrineSlugPage({
      params: Promise.resolve({
        lang: "fr",
        slug: "classifications-contestees",
      }),
    });
    const { container, getByTestId } = render(ui as React.ReactElement);

    assertNoSkippedLevels(headingLevels(container));
    expect(getByTestId("version-label")).toBeTruthy();
    expect(getByTestId("changelog-link")).toBeTruthy();
    expect(getByTestId("mdx-remote").textContent).toContain(
      "Classifications contestées"
    );
    expect(container.innerHTML).toMatch(/max-w-\[72ch\]/);
  });
});
