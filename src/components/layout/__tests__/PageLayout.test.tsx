import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PageLayout } from "@/components/layout/PageLayout";

// One bar for both widths since the three entry points replaced the two
// hand-written ones. Stubbed here: what this file asserts is the title band
// and main's padding, and the bar has its own suite.
vi.mock("@/components/layout/SiteHeader", () => ({
  SiteHeader: () => <nav aria-label="Navigation principale" />,
}));

vi.mock("@/components/search/SearchModalV2", () => ({
  SearchModalV2: () => null,
}));

vi.mock("@/components/layout/KeyboardShortcutsModal", () => ({
  KeyboardShortcutsModal: () => null,
}));

vi.mock("@/components/layout/SiteFooter", () => ({
  SiteFooter: () => <footer />,
}));

vi.mock("@/hooks/use-keyboard-shortcuts", () => ({
  useKeyboardShortcuts: () => undefined,
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => true,
}));

let mockPathname = "/fr/peuples-dafrique";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => mockPathname,
}));

vi.mock("@/lib/routing", () => ({
  getLocalizedRoute: () => "/fr/recherche",
}));

vi.mock("@/lib/translations", () => ({
  getTranslation: () => ({
    title: "EthniAfrica",
    madeWithEmotion: "Créé avec émotion",
  }),
}));

vi.mock("next/image", () => ({
  default: ({ alt, className }: { alt: string; className?: string }) => (
    <span role="img" aria-label={alt} className={className} />
  ),
}));

describe("PageLayout title", () => {
  // @req REQ-043
  // @req REQ-044
  it("keeps a readable foreground fallback while preserving its typography", () => {
    render(
      <PageLayout language="fr" title="Peuples d'Afrique">
        <p>Page content</p>
      </PageLayout>
    );

    const heading = screen.getByRole("heading", {
      level: 1,
      name: "Peuples d'Afrique",
    });

    expect(heading).toHaveClass(
      "text-foreground",
      "text-3xl",
      "md:text-4xl",
      "font-display",
      "font-bold",
      "page-title-gradient"
    );
    expect(heading).not.toHaveClass("text-transparent", "bg-clip-text");
    expect(heading).not.toHaveAttribute("style");
  });

  // @req REQ-043
  it("only makes the title transparent inside the supported gradient rule", () => {
    const stylesheet = readFileSync(
      resolve(process.cwd(), "src/index.css"),
      "utf8"
    );
    const enhancementRule = stylesheet.match(
      /@supports \(\(background-clip: text\) or \(-webkit-background-clip: text\)\) \{\s*\.page-title-gradient \{([\s\S]*?)\}\s*\}/
    );

    expect(enhancementRule).not.toBeNull();
    expect(enhancementRule?.[1]).toContain("background: var(--gradient-warm);");
    expect(enhancementRule?.[1]).toContain("background-clip: text;");
    expect(enhancementRule?.[1]).toContain("-webkit-background-clip: text;");
    expect(enhancementRule?.[1]).toContain("color: transparent;");
    expect(enhancementRule?.[1]).toContain(
      "-webkit-text-fill-color: transparent;"
    );
  });
});

// @req [16.3]
describe("PageLayout — header/main offset (ETNI-820: nav is never fixed, on or off the home route)", () => {
  // @req REQ-043
  it("does not add fixed-nav offset padding to the title header off the home route", () => {
    mockPathname = "/fr/peuples-dafrique";
    render(
      <PageLayout language="fr" title="Peuples d'Afrique">
        <p>Page content</p>
      </PageLayout>
    );

    const header = screen.getByRole("heading", { level: 1 }).closest("header");
    expect(header?.className).not.toMatch(/pt-14|pt-\[57px\]/);
  });

  // @req REQ-043
  it("does not add fixed-nav offset padding to main off the home route", () => {
    mockPathname = "/fr/a-propos";
    render(
      <PageLayout language="fr" hideHeader>
        <p data-testid="content">Page content</p>
      </PageLayout>
    );

    const main = screen.getByTestId("content").closest("main");
    // useIsMobile is mocked to true in this file, so the mobile fixed-nav
    // offset (pt-24) is the one under test off the home route.
    expect(main?.className).not.toMatch(/pt-24|pt-28/);
  });

  // @req REQ-043
  it("does not add fixed-nav offset padding to main on the home route either (ETNI-820)", () => {
    mockPathname = "/fr";
    render(
      <PageLayout language="fr" hideHeader>
        <p data-testid="content">Page content</p>
      </PageLayout>
    );

    const main = screen.getByTestId("content").closest("main");
    expect(main?.className).not.toMatch(/pt-24|pt-28/);
  });
});

// A full-bleed child (HomeHero escapes the container with 100vw + negative
// margins) cancels only the horizontal gutter, so main's vertical padding
// still pushed the hero's tinted band away from the nav border, leaving a
// visible strip of page background between the two.
describe("PageLayout — flushTop", () => {
  // @req REQ-044
  it("keeps main's top padding by default", () => {
    mockPathname = "/fr";
    render(
      <PageLayout language="fr" hideHeader>
        <p data-testid="content">Page content</p>
      </PageLayout>
    );

    const main = screen.getByTestId("content").closest("main");
    expect(main?.className).toMatch(/\bpy-4\b/);
  });

  // @req REQ-044
  it("drops main's top padding when flushTop is set, keeping the bottom one", () => {
    mockPathname = "/fr";
    render(
      <PageLayout language="fr" hideHeader flushTop>
        <p data-testid="content">Page content</p>
      </PageLayout>
    );

    const main = screen.getByTestId("content").closest("main");
    expect(main?.className).toMatch(/\bpb-4\b/);
    expect(main?.className).not.toMatch(/\bpy-\d/);
    expect(main?.className).not.toMatch(/\bpt-\d/);
  });
});

/**
 * A fiche brings its own title — the entity's name, on the parchment. Leaving
 * the section band on gave the three globe fiches two `h1`s, the first of them
 * a category ("Pays") rather than the subject, which is also what a screen
 * reader announced first.
 */
describe("PageLayout — the section band a fiche must not raise", () => {
  // @req REQ-043
  it("raises the section band by default, so a directory still gets its title", () => {
    render(
      <PageLayout language="fr" sectionName="Pays">
        <p>corps</p>
      </PageLayout>
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Pays" })
    ).toBeInTheDocument();
  });

  // @req REQ-043
  it("leaves the page's own heading as the only one when hideHeader is set", () => {
    render(
      <PageLayout language="fr" sectionName="Pays" hideHeader flushTop>
        <h1>Afrique du Sud</h1>
      </PageLayout>
    );

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("heading", { level: 1, name: "Afrique du Sud" })
    ).toBeInTheDocument();
  });
});
