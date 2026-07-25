import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PageLayout } from "@/components/layout/PageLayout";

vi.mock("@/components/MobileNavBar", () => ({
  MobileNavBar: () => <nav aria-label="Mobile navigation" />,
}));

vi.mock("@/components/layout/DesktopNavBar", () => ({
  DesktopNavBar: () => <nav aria-label="Desktop navigation" />,
}));

vi.mock("@/components/search/SearchModalV2", () => ({
  SearchModalV2: () => null,
}));

vi.mock("@/components/layout/KeyboardShortcutsModal", () => ({
  KeyboardShortcutsModal: () => null,
}));

vi.mock("@/hooks/use-keyboard-shortcuts", () => ({
  useKeyboardShortcuts: () => undefined,
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => true,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
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
    expect(screen.getByText("BIG")).toHaveClass("text-amber-700");
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
