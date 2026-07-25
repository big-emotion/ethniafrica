import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CitationBlock } from "@/components/system/CitationBlock";

const LIVE_URL = "https://example.org/fr/fiche/reference";
const PINNED_URL = "https://example.org/fr/fiche/reference@v7";
const ACCESSED_AT = new Date("2026-07-14T12:00:00.000Z");
const PLAIN_LIVE_CITATION =
  "Fiche de référence (Nom autonome / Nom usuel). Africa History. https://example.org/fr/fiche/reference. Consulté le 14 juillet 2026. CC-BY-SA 4.0.";

function renderCitationBlock(
  overrides: Partial<React.ComponentProps<typeof CitationBlock>> = {}
) {
  return render(
    <CitationBlock
      title="Fiche de référence (Nom autonome / Nom usuel)"
      liveUrl={LIVE_URL}
      accessedAt={ACCESSED_AT}
      {...overrides}
    />
  );
}

describe("CitationBlock", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // @req REQ-021
  it("renders the exact default plain-text citation and permanent license", () => {
    renderCitationBlock();

    expect(screen.getByRole("textbox", { name: "Citation" })).toHaveValue(
      PLAIN_LIVE_CITATION
    );
    expect(screen.getByText("CC-BY-SA 4.0")).toBeInTheDocument();
    expect(screen.getByTestId("citation-block")).toHaveAttribute(
      "data-variant",
      "live"
    );
  });

  // @req REQ-021
  it("switches to the pinned canonical URL from the pinned tab", async () => {
    const user = userEvent.setup();
    renderCitationBlock({
      pinned: { version: 7, url: PINNED_URL },
    });

    await user.click(screen.getByRole("tab", { name: "Version figée @v7" }));

    expect(
      screen.getByRole<HTMLTextAreaElement>("textbox", { name: "Citation" })
        .value
    ).toContain(PINNED_URL);
    expect(screen.getByTestId("citation-block")).toHaveAttribute(
      "data-variant",
      "pinned"
    );
  });

  // @req REQ-021
  it("switches citation format while preserving the license", async () => {
    const user = userEvent.setup();
    renderCitationBlock();

    await user.click(screen.getByRole("combobox", { name: "Format" }));
    await user.click(screen.getByRole("option", { name: "BibTeX" }));

    const preview = screen.getByRole<HTMLTextAreaElement>("textbox", {
      name: "Citation",
    });
    expect(preview.value).toContain("@misc{");
    expect(preview.value).toContain("CC-BY-SA 4.0.");

    await user.click(screen.getByRole("combobox", { name: "Format" }));
    await user.click(screen.getByRole("option", { name: "Markdown" }));

    expect(preview.value).toContain(
      "[Fiche de référence \\(Nom autonome / Nom usuel\\)]"
    );
    expect(preview.value).toContain("CC-BY-SA 4.0.");
  });

  // @req REQ-021
  it("copies the active preview and announces success politely", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const setTimeoutSpy = vi.spyOn(window, "setTimeout");
    const user = userEvent.setup();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    renderCitationBlock();

    await user.click(
      screen.getByRole("button", { name: "Copier la citation" })
    );

    expect(writeText).toHaveBeenCalledWith(PLAIN_LIVE_CITATION);
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
    expect(screen.getByRole("status")).toHaveTextContent("copié");

    const clearAnnouncement = setTimeoutSpy.mock.calls
      .filter((call) => call[1] === 2000)
      .at(-1)?.[0];
    act(() => {
      if (typeof clearAnnouncement === "function") clearAnnouncement();
    });
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  // @req REQ-021
  it("focuses and selects the preview when clipboard access is denied", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("NotAllowedError"));
    const user = userEvent.setup();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    renderCitationBlock();

    await user.click(
      screen.getByRole("button", { name: "Copier la citation" })
    );

    const preview = screen.getByRole<HTMLTextAreaElement>("textbox", {
      name: "Citation",
    });
    await waitFor(() => expect(preview).toHaveFocus());
    expect(preview.selectionStart).toBe(0);
    expect(preview.selectionEnd).toBe(PLAIN_LIVE_CITATION.length);
    expect(screen.getByRole("status")).toHaveTextContent(
      "sélectionner manuellement"
    );
  });

  // @req REQ-021
  it("derives a safe printable link from the active canonical URL", async () => {
    const user = userEvent.setup();
    renderCitationBlock({
      pinned: { version: 7, url: PINNED_URL },
    });

    await user.click(screen.getByRole("tab", { name: "Version figée @v7" }));

    expect(
      screen.getByRole("link", { name: "Version imprimable" })
    ).toHaveAttribute(
      "href",
      "https://example.org/fr/fiche/reference@v7?print=1"
    );
    expect(
      screen.getByRole("link", { name: "Version imprimable" })
    ).toHaveAttribute("target", "_blank");
    expect(
      screen.getByRole("link", { name: "Version imprimable" })
    ).toHaveAttribute("rel", "noopener noreferrer");
  });

  // @req REQ-021
  it("omits the pinned tab when no pinned version exists", () => {
    renderCitationBlock();

    expect(
      screen.queryByRole("tab", { name: /version figée/i })
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole("tab")).toHaveLength(1);
  });

  // @req REQ-021
  it("starts pinned when requested and falls back to live without pinned data", () => {
    const { rerender } = renderCitationBlock({
      pinned: { version: 7, url: PINNED_URL },
      defaultVariant: "pinned",
    });

    expect(
      screen.getByRole("tab", { name: "Version figée @v7" })
    ).toHaveAttribute("data-state", "active");
    expect(screen.getByTestId("citation-block")).toHaveAttribute(
      "data-variant",
      "pinned"
    );

    rerender(
      <CitationBlock
        title="Fiche de référence (Nom autonome / Nom usuel)"
        liveUrl={LIVE_URL}
        accessedAt={ACCESSED_AT}
        defaultVariant="pinned"
      />
    );

    expect(screen.getByTestId("citation-block")).toHaveAttribute(
      "data-variant",
      "live"
    );
  });

  // @req REQ-021
  it("supports keyboard tab switching and native action focus", async () => {
    const user = userEvent.setup();
    renderCitationBlock({
      pinned: { version: 7, url: PINNED_URL },
    });

    const tablist = screen.getByRole("tablist");
    const liveTab = within(tablist).getByRole("tab", {
      name: "Version vivante",
    });
    liveTab.focus();
    await user.keyboard("{ArrowRight}");

    expect(
      within(tablist).getByRole("tab", { name: "Version figée @v7" })
    ).toHaveAttribute("data-state", "active");

    screen.getByRole("button", { name: "Copier la citation" }).focus();
    expect(
      screen.getByRole("button", { name: "Copier la citation" })
    ).toHaveFocus();
  });
});
