import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PageLayout } from "@/components/layout/PageLayout";
import { getLocalizedRoute } from "@/lib/routing";

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

// `@/lib/routing` is deliberately not mocked. It is a pure slug table with no
// dependencies, so a stub could only ever restate what it already answers —
// and a stub that restated it as a literal is what made this suite assert the
// header pointed at an address the site had stopped serving.

// Only `getTranslation` is stubbed, and the rest of the module is kept: the
// shell now renders the trail, which reads its labels from the real
// `translations`. A stub that dropped them left `deriveTrail` naming nothing
// and took the whole suite down with it — the same argument as the note above
// about not stubbing `@/lib/routing`.
vi.mock("@/lib/translations", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/translations")>()),
  getTranslation: () => ({
    title: "EthniAfrica",
    madeWithEmotion: "Créé avec émotion",
  }),
}));

// The band renders no image any more, so this stub has nothing left to stand
// in for — it is kept as the tripwire for the assertion below: anything put
// back into the band through `next/image` reappears as a `role="img"`, and
// "carries no brand mark beside the title" goes red instead of silently
// passing over a component the test environment could not render.
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

    // The size and the family moved into `hero.css` with the band itself, so
    // the title no longer names them as utilities. What has to survive that
    // move is the reason this test exists: the gradient is applied inside an
    // `@supports`, and the element must carry no hard-coded transparency of
    // its own — otherwise a browser without `background-clip: text` renders an
    // invisible title rather than a plain one.
    expect(heading).toHaveClass("afh-hero-title", "page-title-gradient");
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

    const hero = screen.getByTestId("page-hero");
    expect(hero.className).not.toMatch(/pt-14|pt-\[57px\]/);
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
/**
 * The trail is the shell's, and this is where that is actually observed. The
 * coverage test proves every route *reaches* a mount by reading imports; only
 * a render proves the mount puts a trail on the page, above the content, on a
 * fiche route that passes `hideHeader` as much as on a directory that does not.
 */
describe("PageLayout — the trail the shell owns", () => {
  // @req REQ-115
  it("renders the trail above main, and keeps it when the title band is hidden", () => {
    mockPathname = getLocalizedRoute("fr", "countries");
    render(
      <PageLayout language="fr" hideHeader>
        <p data-testid="content">Page content</p>
      </PageLayout>
    );

    const trail = screen.getByRole("navigation", { name: "Fil d'ariane" });
    expect(trail).toHaveTextContent("Pays");

    const main = screen.getByTestId("content").closest("main");
    expect(
      trail.compareDocumentPosition(main as Node) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  /**
   * A fiche identifier is the one crumb the shell cannot name on its own, so
   * the route hands it over rather than mounting a second trail beside it.
   */
  // @req REQ-115
  it("prints the label the route passes for the identifier in the address", () => {
    mockPathname = `${getLocalizedRoute("fr", "countries")}/BEN`;
    render(
      <PageLayout language="fr" hideHeader flushTop trailLabel="Bénin">
        <p data-testid="content">Page content</p>
      </PageLayout>
    );

    const trail = screen.getByRole("navigation", { name: "Fil d'ariane" });
    expect(trail).toHaveTextContent("Bénin");
    expect(trail).not.toHaveTextContent("BEN,");
  });

  /**
   * The one surface that wants no page identity at all is the wait. A trail
   * rendered there names a destination the reader has not arrived at, and it
   * takes fold from the interstitial that is meant to be read whole.
   */
  // @req REQ-115
  it("drops the trail for a shell asked to carry no page identity", () => {
    mockPathname = getLocalizedRoute("fr", "countries");
    render(
      <PageLayout language="fr" hideHeader hideTrail>
        <p data-testid="content">Page content</p>
      </PageLayout>
    );

    expect(
      screen.queryByRole("navigation", { name: "Fil d'ariane" })
    ).toBeNull();
  });
});

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

  // A full-bleed last section owns the seam with the footer just as a
  // full-bleed first section owns the seam with the chrome. Keeping main's
  // bottom padding inserts a strip of unrelated page ground between them.
  // @req REQ-044
  it("can let a full-bleed final section meet the footer without a gap", () => {
    mockPathname = "/fr";
    render(
      <PageLayout language="fr" hideHeader flushTop flushBottom>
        <p data-testid="content">Page content</p>
      </PageLayout>
    );

    const main = screen.getByTestId("content").closest("main");
    expect(main?.className).not.toMatch(/\bpb-\d/);
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

/**
 * What the band is for, and what it stopped being.
 *
 * It carried the product logo and, whenever a route passed no title of its
 * own, the product name — both already on screen in the bar immediately
 * above. On the three hubs that made the tallest element of the page a second
 * copy of the masthead, under which the trail had already come and gone. The
 * band now states the page or is not raised at all, and the trail reads as
 * what follows a title rather than what precedes a logo.
 */
describe("PageLayout — the band names the page, not the product", () => {
  // @req REQ-043
  it("carries no brand mark beside the title", () => {
    mockPathname = getLocalizedRoute("fr", "dossiersHub");
    render(
      <PageLayout language="fr" title="Comprendre les peuples d'Afrique">
        <p>corps</p>
      </PageLayout>
    );

    const plate = screen.getByTestId("page-hero-plate");
    expect(plate.querySelector("[role='img'], img")).toBeNull();
  });

  // @req REQ-043
  it("raises no band at all rather than falling back to the product name", () => {
    mockPathname = getLocalizedRoute("fr", "dossiersHub");
    render(
      <PageLayout language="fr">
        <p data-testid="content">corps</p>
      </PageLayout>
    );

    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    expect(screen.queryByText("EthniAfrica")).toBeNull();
  });

  /**
   * The trail used to hang in a container of its own between the band and
   * main, which is how it ended up on a different vertical from the title it
   * qualifies. Sharing the plate settles the alignment structurally: there is
   * no second box left to disagree with the first.
   *
   * What still has to be asserted is the pair the plate cannot settle — the
   * band's box and the body's box are two different elements, and they line up
   * only for as long as they name the same shell.
   */
  // @req REQ-115
  it("hangs the trail on the same gutter as the title and the page body", () => {
    mockPathname = getLocalizedRoute("fr", "countries");
    render(
      <PageLayout language="fr" sectionName="Pays">
        <p data-testid="content">corps</p>
      </PageLayout>
    );

    const trail = screen.getByRole("navigation", { name: "Fil d'ariane" });
    const plate = screen.getByTestId("page-hero-plate");
    const body = screen.getByTestId("content").closest("main");

    expect(plate).toContainElement(trail);
    expect(plate).toContainElement(screen.getByRole("heading", { level: 1 }));
    expect(plate.closest(".afh-shell")).not.toBeNull();
    expect(body).toHaveClass("afh-shell");
  });

  // @req REQ-115
  it("puts the trail under the title rather than over it", () => {
    mockPathname = getLocalizedRoute("fr", "countries");
    render(
      <PageLayout language="fr" sectionName="Pays">
        <p data-testid="content">corps</p>
      </PageLayout>
    );

    const heading = screen.getByRole("heading", { level: 1 });
    const trail = screen.getByRole("navigation", { name: "Fil d'ariane" });

    expect(
      heading.compareDocumentPosition(trail) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });
});
