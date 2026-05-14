import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  within,
  cleanup,
} from "@testing-library/react";
import SourceChainSheet, {
  type Source,
  type SourceChainSheetProps,
} from "../SourceChainSheet";

const baseSource: Source = {
  id: "src-1",
  title: "Atlas linguistique de l'Afrique",
  author: "M. Diop",
  year: 2021,
  page: "p. 42",
  url: "https://example.org/atlas",
  tier: "primary",
  brokenAt: null,
};

const renderSheet = (override: Partial<SourceChainSheetProps> = {}) => {
  const onOpenChange = vi.fn();
  const props: SourceChainSheetProps = {
    open: true,
    onOpenChange,
    assertion: {
      statement: "Le peuple Seereer est attesté depuis le XIIIe siècle.",
      position: undefined,
      confidenceScore: 0.82,
      sourceCount: 3,
      lastHumanAuditAt: "2026-04-01",
    },
    sources: [baseSource],
    anchorId: "chip-paragraph-3",
    ...override,
  };
  const utils = render(<SourceChainSheet {...props} />);
  return { ...utils, onOpenChange, props };
};

beforeEach(() => {
  // Default to desktop viewport for matchMedia
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

afterEach(() => {
  cleanup();
});

describe("SourceChainSheet", () => {
  it("renders a dialog with role and aria-modal", () => {
    renderSheet();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("uses aria-labelledby pointing to the assertion statement", () => {
    renderSheet();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute(
      "aria-labelledby",
      "chip-paragraph-3-statement"
    );
    const statement = document.getElementById("chip-paragraph-3-statement");
    expect(statement).not.toBeNull();
    expect(statement?.textContent).toContain("Seereer");
  });

  it("renders sections in strict order", () => {
    renderSheet({
      openFlagCount: 2,
      revisionUrl: "https://example.org/revision",
    });
    const sections = screen.getAllByTestId(/^section-/);
    const order = sections.map((el) => el.getAttribute("data-testid"));
    expect(order).toEqual([
      "section-assertion",
      "section-confidence",
      "section-flags",
      "section-sources",
      "section-revision",
      "section-flag-target",
      "section-cite",
    ]);
  });

  it("does not render the flag banner when no open flags", () => {
    renderSheet({ openFlagCount: 0 });
    expect(screen.queryByTestId("section-flags")).toBeNull();
  });

  it("does not render the revision link when revisionUrl is missing", () => {
    renderSheet();
    expect(screen.queryByTestId("section-revision")).toBeNull();
  });

  it("renders a disabled FlagTarget shell button", () => {
    renderSheet();
    const flagTarget = screen.getByTestId("section-flag-target");
    const btn = within(flagTarget).getByRole("button");
    expect(btn).toBeDisabled();
  });

  it("renders broken-link sources with line-through URL and a calm badge", () => {
    renderSheet({
      sources: [
        {
          ...baseSource,
          brokenAt: "2026-04-10",
        },
      ],
    });
    const link = screen.getByTestId("source-url-src-1");
    expect(link.className).toMatch(/line-through/);
    expect(screen.getByTestId("source-broken-badge-src-1")).toHaveTextContent(
      /lien non résolu — signalé le 10 avril 2026/i
    );
  });

  it("renders broken-link URL as a span (not an anchor) to prevent navigation", () => {
    renderSheet({
      sources: [
        {
          ...baseSource,
          brokenAt: "2026-04-10",
        },
      ],
    });
    const el = screen.getByTestId("source-url-src-1");
    expect(el.tagName.toLowerCase()).toBe("span");
    expect(el).toHaveAttribute("aria-disabled", "true");
    expect(el).not.toHaveAttribute("href");
  });

  it("renders javascript: URLs as a plain span (safeUrl guard)", () => {
    renderSheet({
      sources: [
        {
          ...baseSource,
          url: "javascript:alert('xss')",
        },
      ],
    });
    const el = screen.getByTestId("source-url-src-1");
    expect(el.tagName.toLowerCase()).toBe("span");
    expect(el).not.toHaveAttribute("href");
  });

  it("calls onOpenChange(false) when Escape is pressed", () => {
    const { onOpenChange } = renderSheet();
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("renders multi-position positions as separate source lists", () => {
    renderSheet({
      positions: [
        {
          position: "Origine nilotique",
          sources: [{ ...baseSource, id: "src-a", title: "Source A" }],
        },
        {
          position: "Origine bantoue",
          sources: [
            {
              ...baseSource,
              id: "src-b",
              title: "Source B",
              tier: "secondary",
            },
          ],
        },
      ],
      sources: [],
    });
    const sourcesSection = screen.getByTestId("section-sources");
    const positionGroups =
      within(sourcesSection).getAllByTestId(/^position-group-/);
    expect(positionGroups).toHaveLength(2);
    expect(positionGroups[0]).toHaveTextContent("Origine nilotique");
    expect(positionGroups[0]).toHaveTextContent("Source A");
    expect(positionGroups[1]).toHaveTextContent("Origine bantoue");
    expect(positionGroups[1]).toHaveTextContent("Source B");
  });

  it("groups single-list sources by tier", () => {
    renderSheet({
      sources: [
        { ...baseSource, id: "p1", tier: "primary", title: "Primary src" },
        { ...baseSource, id: "s1", tier: "secondary", title: "Secondary src" },
        { ...baseSource, id: "t1", tier: "tertiary", title: "Tertiary src" },
        { ...baseSource, id: "a1", tier: "ai-enriched", title: "AI src" },
      ],
    });
    const sourcesSection = screen.getByTestId("section-sources");
    expect(
      within(sourcesSection).getByTestId("tier-group-primary")
    ).toBeInTheDocument();
    expect(
      within(sourcesSection).getByTestId("tier-group-secondary")
    ).toBeInTheDocument();
    expect(
      within(sourcesSection).getByTestId("tier-group-tertiary")
    ).toBeInTheDocument();
    expect(
      within(sourcesSection).getByTestId("tier-group-ai-enriched")
    ).toBeInTheDocument();
  });

  it("renders the confidence block with the score", () => {
    renderSheet();
    const confidence = screen.getByTestId("section-confidence");
    expect(confidence).toHaveTextContent("82");
  });

  it("returns null when open is false", () => {
    const { container } = renderSheet({ open: false });
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it("opens only the first sheet instance when the URL hash matches the anchor", async () => {
    window.history.replaceState(null, "", "/?#chip-shared");
    const onOpenChangeA = vi.fn();
    const onOpenChangeB = vi.fn();
    const propsBase: Omit<SourceChainSheetProps, "onOpenChange"> = {
      open: false,
      assertion: {
        statement: "shared",
        confidenceScore: 0.5,
        sourceCount: 1,
        lastHumanAuditAt: null,
      },
      sources: [baseSource],
      anchorId: "chip-shared",
    };
    render(
      <>
        <SourceChainSheet {...propsBase} onOpenChange={onOpenChangeA} />
        <SourceChainSheet {...propsBase} onOpenChange={onOpenChangeB} />
      </>
    );
    expect(onOpenChangeA).toHaveBeenCalledWith(true);
    expect(onOpenChangeB).not.toHaveBeenCalled();
    window.history.replaceState(null, "", "/");
  });
});

describe("LazySourceChainSheet", () => {
  it("imports cleanly from the dedicated lazy file", async () => {
    const mod = await import("../SourceChainSheet.lazy");
    expect(mod.LazySourceChainSheet).toBeDefined();
    expect(typeof mod.LazySourceChainSheet).toBe("function");
  });
});
