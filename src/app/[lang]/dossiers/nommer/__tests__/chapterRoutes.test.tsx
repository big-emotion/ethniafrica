import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { NOMMER_CHAPTERS } from "@/lib/dossiers/nommer/chapters";
import { NOMMER_CHAPTER_KEYS, NOMMER_CHAPTER_SLUGS } from "@/lib/routing";

import LaChosePage from "../la-chose/page";
import LaLanguePage from "../la-langue/page";
import LaPersonnePage from "../la-personne/page";
import LePaysPage from "../le-pays/page";
import LePeuplePage from "../le-peuple/page";

vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({
    children,
    title,
  }: {
    children: React.ReactNode;
    title?: string;
  }) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

vi.mock("@/components/fiche/FicheChapterBar", () => ({
  FicheChapterBar: () => null,
}));

const SEGMENT_ROOT = resolve(process.cwd(), "src/app/[lang]/dossiers/nommer");

describe("the Nommer chapter routes", () => {
  // A chapter declared in the content module and missing from disk would be a
  // tile linking to a 404 — and nothing else in the build would say so.
  // @req REQ-113
  it("gives every declared chapter a page at its own slug", () => {
    for (const key of NOMMER_CHAPTER_KEYS) {
      const slug = NOMMER_CHAPTER_SLUGS.fr[key];
      expect(
        existsSync(join(SEGMENT_ROOT, slug, "page.tsx")),
        `${slug}/page.tsx`
      ).toBe(true);
    }
  });

  // The two bans that let one `loading.tsx` cover the whole dossier. Asserted
  // here rather than trusted, because either would pass typecheck and build.
  // @req REQ-113
  it("keeps the chapters static and able to resolve", () => {
    for (const key of NOMMER_CHAPTER_KEYS) {
      const slug = NOMMER_CHAPTER_SLUGS.fr[key];
      const source = readFileSync(join(SEGMENT_ROOT, slug, "page.tsx"), "utf8");
      expect(source, slug).not.toContain("generateStaticParams");
      expect(source, slug).not.toContain("notFound");
    }
  });

  // @req REQ-113
  it("declares exactly one wait screen, at the root of the segment", () => {
    expect(existsSync(join(SEGMENT_ROOT, "loading.tsx"))).toBe(true);
    for (const key of NOMMER_CHAPTER_KEYS) {
      const slug = NOMMER_CHAPTER_SLUGS.fr[key];
      expect(
        existsSync(join(SEGMENT_ROOT, slug, "loading.tsx")),
        `${slug}/loading.tsx`
      ).toBe(false);
    }
  });

  // @req REQ-113
  it("renders each chapter under its own title", () => {
    const pages = [
      [LePeuplePage, "le-peuple"],
      [LePaysPage, "le-pays"],
      [LaPersonnePage, "la-personne"],
      [LaLanguePage, "la-langue"],
      [LaChosePage, "la-chose"],
    ] as const;

    for (const [Page, key] of pages) {
      const chapter = NOMMER_CHAPTERS.find((entry) => entry.key === key);
      const { unmount } = render(<Page />);
      expect(
        screen.getByRole("heading", { level: 1, name: chapter.title })
      ).toBeInTheDocument();
      unmount();
    }
  });

  // The reader leaves through the other chapters rather than back through the
  // pillar — which is the whole reason the tiles navigate.
  // @req REQ-113
  it("offers the four other chapters at the foot of a chapter", () => {
    render(<LaLanguePage />);
    const others = screen.getByRole("navigation", {
      name: "Les autres chapitres",
    });

    for (const chapter of NOMMER_CHAPTERS) {
      if (chapter.key === "la-langue") continue;
      expect(others).toHaveTextContent(chapter.title);
    }
    expect(others).not.toHaveTextContent("La langue");
  });
});
