import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { NommerChapterPage } from "@/components/dossiers/nommer/NommerChapterPage";
import {
  NOMMER_CHAPTERS,
  getNommerChapter,
} from "@/lib/dossiers/nommer/chapters";
import { NOMMER_CHAPTERS_EN } from "@/lib/dossiers/nommer/chapters/index.en";
import { NOMMER_CHAPTER_KEYS, NOMMER_CHAPTER_SLUGS } from "@/lib/routing";

vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({
    children,
    title,
    subtitle,
  }: {
    children: React.ReactNode;
    title?: string;
    subtitle?: string;
  }) => (
    <div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {children}
    </div>
  ),
}));

vi.mock("@/components/fiche/FicheChapterBar", () => ({
  FicheChapterBar: () => null,
}));

const SEGMENT_ROOT = resolve(process.cwd(), "src/app/[lang]/dossiers/nommer");

const sourceOf = (slug: string) =>
  readFileSync(join(SEGMENT_ROOT, slug, "page.tsx"), "utf8");

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

  // Static in the sense that matters: no parameterised segment underneath, so
  // the five slugs stay five files. `generateStaticParams` here would mean a
  // chapter route resolving names it does not own.
  // @req REQ-113
  it("keeps the chapters static", () => {
    for (const key of NOMMER_CHAPTER_KEYS) {
      const slug = NOMMER_CHAPTER_SLUGS.fr[key];
      expect(sourceOf(slug), slug).not.toContain("generateStaticParams");
    }
  });

  // Each chapter asks the registry rather than trusting the pillar to have
  // asked: five files is five doors, and a reader with a bookmark opens one
  // of them directly.
  // @req REQ-113
  it("makes every chapter answer to the freeze on its own", () => {
    for (const key of NOMMER_CHAPTER_KEYS) {
      const slug = NOMMER_CHAPTER_SLUGS.fr[key];
      expect(sourceOf(slug), slug).toContain('isModulePublished("nommer")');
    }
  });

  /**
   * The segment carried one `loading.tsx` for the whole dossier, and it is
   * gone with the freeze rather than by oversight.
   *
   * `loaderCoverage.test.ts` forbids a wait screen above a route that can
   * answer 404, and every chapter can while `nommer` is withdrawn. A boundary
   * left here would stream the frame of a page that is not coming, which a
   * crawler reads as a soft 404. Restoring the dossier restores this file.
   */
  // @req REQ-113
  it("declares no wait screen while the dossier is withdrawn", () => {
    expect(existsSync(join(SEGMENT_ROOT, "loading.tsx"))).toBe(false);
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
    for (const chapter of NOMMER_CHAPTERS) {
      const { unmount } = render(
        <NommerChapterPage chapter={chapter} language="fr" />
      );
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
    render(
      <NommerChapterPage
        chapter={getNommerChapter("la-langue")}
        language="fr"
      />
    );
    const others = screen.getByRole("navigation", {
      name: "Les autres chapitres",
    });

    for (const chapter of NOMMER_CHAPTERS) {
      if (chapter.key === "la-langue") continue;
      expect(others).toHaveTextContent(chapter.title);
    }
    expect(others).not.toHaveTextContent("La langue");
  });

  // @req REQ-145
  it("renders the English sidecar throughout an English chapter", () => {
    const translation = NOMMER_CHAPTERS_EN["le-peuple"];
    render(
      <NommerChapterPage
        chapter={getNommerChapter("le-peuple")}
        language="en"
      />
    );

    expect(
      screen.getByRole("heading", { level: 1, name: translation.title })
    ).toBeInTheDocument();
    expect(screen.getByText(translation.standfirst)).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Other chapters" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("status", {
        name: "Machine translation, not yet reviewed",
      })
    ).toBeInTheDocument();
    expect(screen.queryByText(/exonyme dépréciatif attesté/)).toBeNull();
    expect(screen.getAllByText(/attested derogatory exonym/)).not.toHaveLength(
      0
    );
  });
});
