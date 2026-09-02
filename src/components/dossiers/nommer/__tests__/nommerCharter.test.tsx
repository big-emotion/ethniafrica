import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

import { fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider } from "next-themes";
import { describe, expect, it, vi } from "vitest";

import { NommerPillarPage } from "@/components/dossiers/nommer/NommerPillarPage";
import { GlossaryPage } from "@/components/glossaire/GlossaryPage";
import { ModuleAvailabilityProvider } from "@/components/hubs/ModuleAvailabilityProvider";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { NOMMER_CHAPTERS } from "@/lib/dossiers/nommer/chapters";
import {
  ACCESS_MODES,
  ACCESS_MODE_LABELS,
  getModulesForAccessMode,
} from "@/lib/hubs/moduleRegistry";
import { NOMMER_CHAPTER_KEYS, NOMMER_CHAPTER_SLUGS } from "@/lib/routing";

vi.mock("next/navigation", () => ({
  usePathname: () => "/fr",
}));

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

const SEGMENT_ROOT = resolve(process.cwd(), "src/app/[lang]/dossiers/nommer");
const STYLESHEET = resolve(process.cwd(), "src/styles/dossier-nommer.css");

describe("the Nommer dossier — charter contract", () => {
  // The rubric's order is the registry's declaration order, so this is also
  // the order the menu, the home panel and the mobile drawer render.
  // @req REQ-114
  it("opens the Dossiers rubric", () => {
    expect(getModulesForAccessMode("dossiers")[0]?.id).toBe("nommer");
  });

  // Brand charter §5.2: one accent, set once, at page level. A nested wrapper
  // is legitimate only where the nested block is an object of another kind.
  // @req REQ-113
  it("scopes each of its pages to exactly one accent", () => {
    for (const Page of [NommerPillarPage, GlossaryPage]) {
      const { container, unmount } = render(<Page />);
      expect(container.querySelectorAll("[class*='afh-accent-']")).toHaveLength(
        1
      );
      unmount();
    }
  });

  // Actions charter: the arrow belongs to `ActionLink` and to nothing else.
  // A tile that drew one would be a fifth shape claiming a promise the
  // stretched anchor has already made.
  // @req REQ-113
  it("draws no arrow of its own on a chapter tile", () => {
    render(<NommerPillarPage />);

    for (const chapter of NOMMER_CHAPTERS) {
      expect(
        screen.getByTestId(`nommer-chapter-${chapter.key}`).textContent
      ).not.toContain("→");
    }
  });

  // Typography charter §4: a card gets three levels — title, support,
  // metadata — and "no fourth level. A card that needs one is a fiche."
  // @req REQ-113
  it("gives a chapter tile three levels and no fourth", () => {
    render(<NommerPillarPage />);
    const tile = screen.getByTestId("nommer-chapter-le-peuple");
    const chapter = NOMMER_CHAPTERS[0];

    expect(tile).toHaveTextContent(chapter.title);
    expect(tile).toHaveTextContent(chapter.question);
    expect(tile).toHaveTextContent(chapter.measure.value);
    // The support line asks; it never states a figure, because a claim on a
    // navigation tile has nowhere to put its source.
    expect(chapter.question).not.toMatch(/\d/);
  });

  // `mobile-text.css` centres the body below 768 px and rules only `p`,
  // `blockquote`, `dt` and `dd` back to the left — and the card writes its
  // title in a `<span>`. Without an explicit declaration the title sits
  // centred above a left-aligned measure, inside one card: the "one
  // declaration, three alignments" defect of brand charter §8.1.
  // @req REQ-113
  it("declares the alignment of every tile rather than inheriting it", () => {
    render(<NommerPillarPage />);

    for (const chapter of NOMMER_CHAPTERS) {
      expect(
        screen.getByTestId(`nommer-chapter-${chapter.key}`).className
      ).toContain("text-left");
    }
  });

  // `animation-delay` is not a duration: `motion.css` collapses the durations
  // under `reduce` and leaves a hand-written delay standing, so the last tile
  // would sit invisible and then snap in. The cascade must be inside the
  // `no-preference` query, not merely built from tokens.
  // @req REQ-113
  it("keeps the arrival cascade inside a reduced-motion guard", () => {
    const sheet = readFileSync(STYLESHEET, "utf8");
    const guarded = sheet.slice(
      sheet.indexOf("@media (prefers-reduced-motion: no-preference)")
    );

    expect(sheet).toContain("@media (prefers-reduced-motion: no-preference)");
    expect(guarded).toContain("animation-delay");
    expect(guarded).toContain("nommer-tile-in");
  });

  // One boundary for the pillar and its five chapters, which
  // `loaderCoverage` allows only while none of the six can answer 404.
  // @req REQ-104
  it("declares one wait screen, and keeps the chapters static", () => {
    expect(existsSync(join(SEGMENT_ROOT, "loading.tsx"))).toBe(true);

    const loadingFiles = readdirSync(SEGMENT_ROOT, {
      recursive: true,
      encoding: "utf8",
    }).filter((entry) => entry.endsWith("loading.tsx"));
    expect(loadingFiles).toEqual(["loading.tsx"]);

    for (const key of NOMMER_CHAPTER_KEYS) {
      const source = readFileSync(
        join(SEGMENT_ROOT, NOMMER_CHAPTER_SLUGS.fr[key], "page.tsx"),
        "utf8"
      );
      expect(source, key).not.toContain("generateStaticParams");
      expect(source, key).not.toContain("notFound");
    }
  });

  // `MODULE_GLYPHS` falls back to `Circle` for an id it does not know, so a
  // module added without a glyph routes, renders and passes every other gate
  // while wearing a blank disc beside twenty modules that carry a sign. That
  // is a regression only a screenshot would catch — which is to say, one that
  // ships.
  // @req REQ-114
  it("gives every module of every axis a glyph of its own", () => {
    for (const mode of ACCESS_MODES) {
      const { unmount } = render(
        <ThemeProvider attribute="class">
          <ModuleAvailabilityProvider value={null}>
            <SiteHeader language="fr" />
          </ModuleAvailabilityProvider>
        </ThemeProvider>
      );

      // The rows only exist once the axis is open — a closed header renders no
      // module at all, which is how the first version of this test passed with
      // the glyph deliberately deleted.
      fireEvent.click(
        screen.getByRole("button", { name: ACCESS_MODE_LABELS[mode] })
      );

      const icons = Array.from(
        screen.getByTestId("site-megapanel").querySelectorAll("svg")
      );
      const glyphs = icons.filter((icon) =>
        icon.getAttribute("class")?.includes("lucide-")
      );
      // Exactly `lucide-circle`, not a prefix of it: `HelpCircle` renders
      // `lucide-circle-question-mark`, which is a chosen glyph and not the
      // fallback.
      const blanks = glyphs.filter((icon) =>
        icon.getAttribute("class")?.split(/\s+/).includes("lucide-circle")
      );

      expect(glyphs.length, mode).toBeGreaterThanOrEqual(
        getModulesForAccessMode(mode).length
      );
      expect(
        blanks.map((icon) => icon.getAttribute("class")),
        mode
      ).toEqual([]);

      unmount();
    }
  });
});
