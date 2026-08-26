import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AtlasFactsPanel,
  type AtlasFactsPanelProps,
} from "@/components/atlas/AtlasFactsPanel";
import {
  BOTTOM_SHEET_VIEW_FRACTION,
  SIDE_PANEL_WIDTH_PX,
  type PanelAnchor,
} from "@/lib/atlas/panelBias";

const GLOBE_TARGET_LABEL = "Choisir le Nigeria";
const POPULATION_FACT = "32 millions de locuteurs";

/**
 * Mirrors how the globe mounts the panel: the stage is the positioned element
 * the panel is anchored inside, and its ref is still null on the first render.
 */
function GlobeStage(props: Omit<AtlasFactsPanelProps, "container">) {
  const [stage, setStage] = useState<HTMLDivElement | null>(null);

  return (
    <div ref={setStage} style={{ position: "relative" }}>
      <button type="button">{GLOBE_TARGET_LABEL}</button>
      <AtlasFactsPanel {...props} container={stage} />
    </div>
  );
}

function renderPanel(overrides: Partial<AtlasFactsPanelProps> = {}) {
  const onClose = overrides.onClose ?? vi.fn();
  const stageProps: Omit<AtlasFactsPanelProps, "container"> = {
    open: overrides.open ?? true,
    anchor: overrides.anchor ?? "bottom",
    title: overrides.title ?? "Yoruba",
    description: overrides.description,
    onClose,
    children: overrides.children ?? <p>{POPULATION_FACT}</p>,
  };
  const view = render(<GlobeStage {...stageProps} />);

  return {
    onClose,
    reanchor: (anchor: PanelAnchor) =>
      view.rerender(<GlobeStage {...stageProps} anchor={anchor} />),
  };
}

/** Lets the DismissableLayer attach its deferred outside-pointerdown listener. */
async function flushDismissableLayerSetup() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("AtlasFactsPanel", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // @req REQ-117
  it("renders nothing until the globe stage ref has resolved", () => {
    render(
      <AtlasFactsPanel
        open
        anchor="bottom"
        title="Yoruba"
        container={null}
        onClose={vi.fn()}
      >
        <p>{POPULATION_FACT}</p>
      </AtlasFactsPanel>
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText(POPULATION_FACT)).not.toBeInTheDocument();
  });

  // @req REQ-117
  it("renders nothing while closed", () => {
    renderPanel({ open: false });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText(POPULATION_FACT)).not.toBeInTheDocument();
  });

  // @req REQ-117
  it("names the open panel after the chosen target and shows its facts", () => {
    renderPanel({ title: "Yoruba", description: "Peuple du golfe du Bénin" });

    expect(screen.getByRole("dialog", { name: "Yoruba" })).toBeInTheDocument();
    expect(screen.getByText(POPULATION_FACT)).toBeInTheDocument();
    expect(screen.getByText("Peuple du golfe du Bénin")).toBeInTheDocument();
  });

  // @req REQ-117
  it("presents the same facts as a bottom sheet and as a side panel", () => {
    const { reanchor } = renderPanel({ anchor: "bottom" });

    expect(screen.getByRole("dialog", { name: "Yoruba" })).toHaveAttribute(
      "data-atlas-panel-anchor",
      "bottom"
    );
    expect(screen.getByText(POPULATION_FACT)).toBeInTheDocument();

    reanchor("side");

    expect(screen.getByRole("dialog", { name: "Yoruba" })).toHaveAttribute(
      "data-atlas-panel-anchor",
      "side"
    );
    expect(screen.getByText(POPULATION_FACT)).toBeInTheDocument();
  });

  // @req REQ-117
  it("marks the panel content so the globe and the e2e spec can find it", () => {
    renderPanel();

    expect(screen.getByRole("dialog")).toHaveAttribute(
      "data-atlas-facts-panel",
      ""
    );
  });

  // @req REQ-117
  it("never covers more of the stage, as a bottom sheet, than the camera bias allows for", () => {
    renderPanel({ anchor: "bottom" });

    // A ceiling, not a fixed height: the sheet is as tall as its facts need.
    // What must hold is that it cannot grow past the share panelBias.ts
    // computed the free region against.
    expect(screen.getByRole("dialog")).toHaveStyle({
      maxHeight: `${BOTTOM_SHEET_VIEW_FRACTION * 100}%`,
    });
  });

  // @req REQ-117
  it("takes a readable column width, as a side panel, rather than a share of the stage", () => {
    renderPanel({ anchor: "side" });

    // A share of the stage would make the facts column narrow on a small
    // desktop and needlessly wide on a large one; a column of prose has a
    // width that reads well and it does not depend on the map behind it.
    expect(screen.getByRole("dialog")).toHaveStyle({
      width: `${SIDE_PANEL_WIDTH_PX}px`,
    });
  });

  // @req REQ-117
  it("closes on the Fermer control", () => {
    const { onClose } = renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "Fermer" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // @req REQ-117
  it("closes on Escape", () => {
    const { onClose } = renderPanel();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // @req REQ-117
  it("leaves the globe visible and interactive instead of covering it with a modal backdrop", () => {
    renderPanel();

    expect(screen.getByRole("dialog")).not.toHaveAttribute("aria-modal");
    expect(
      screen.getByRole("button", { name: GLOBE_TARGET_LABEL })
    ).toBeVisible();
    // A modal Radix dialog neutralises the rest of the page exactly this way.
    expect(document.body.style.pointerEvents).toBe("");
  });

  // @req REQ-117
  it("stays open when the reader picks another target on the globe", async () => {
    const { onClose } = renderPanel();
    await flushDismissableLayerSetup();

    fireEvent.pointerDown(
      screen.getByRole("button", { name: GLOBE_TARGET_LABEL })
    );

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Yoruba" })).toBeInTheDocument();
  });
});
