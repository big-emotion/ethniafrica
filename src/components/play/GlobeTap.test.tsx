import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GlobeTap } from "@/components/play/GlobeTap";

vi.mock("@/components/atlas/AtlasGlobeCanvas", () => ({
  AtlasGlobeCanvas: () => <canvas data-testid="atlas-globe-canvas-mock" />,
}));

function markerFor(countryId: string): HTMLElement {
  const marker = document.querySelector<HTMLElement>(
    `[data-atlas-target="${countryId}"]`
  );
  if (!marker) throw new Error(`no marker rendered for ${countryId}`);
  return marker;
}

describe("GlobeTap (REQ-120)", () => {
  let matchMediaDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    matchMediaDescriptor = Object.getOwnPropertyDescriptor(
      window,
      "matchMedia"
    );
    // Reduced motion is the deterministic way in: the camera lands on its
    // destination without a traversal, so a tap settles within one render.
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("prefers-reduced-motion"),
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (matchMediaDescriptor) {
      Object.defineProperty(window, "matchMedia", matchMediaDescriptor);
    } else {
      Reflect.deleteProperty(window, "matchMedia");
    }
  });

  // @req REQ-120
  it("puts the round's question above the globe stage", () => {
    render(
      <GlobeTap
        promptFr="Où vivent les Yoruba"
        choices={["NGA", "BEN"]}
        onChoose={vi.fn()}
      />
    );

    expect(screen.getByTestId("globe-tap-prompt")).toHaveTextContent(
      "Où vivent les Yoruba"
    );
  });

  // @req REQ-120
  it("offers one tappable choice per proposed country, named in French", () => {
    render(
      <GlobeTap
        promptFr="Où vivent les Yoruba"
        choices={["NGA", "ZAF"]}
        onChoose={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "Nigeria" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Afrique du Sud" })
    ).toBeInTheDocument();
  });

  // @req REQ-120
  it("reports the country the reader tapped", () => {
    const onChoose = vi.fn();
    render(
      <GlobeTap
        promptFr="Où vivent les Yoruba"
        choices={["NGA", "ZAF"]}
        onChoose={onChoose}
      />
    );

    fireEvent.click(markerFor("NGA"));

    expect(onChoose).toHaveBeenCalledTimes(1);
    expect(onChoose).toHaveBeenCalledWith("NGA");
  });

  // @req REQ-120
  it("stops reporting taps once the round is answered", () => {
    const onChoose = vi.fn();
    render(
      <GlobeTap
        promptFr="Où vivent les Yoruba"
        choices={["NGA", "ZAF"]}
        onChoose={onChoose}
        disabled
      />
    );

    fireEvent.click(markerFor("NGA"));
    fireEvent.click(markerFor("ZAF"));

    expect(onChoose).not.toHaveBeenCalled();
  });

  // @req REQ-120
  it("mounts exactly one globe engine, never a second renderer beside the atlas one", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      {} as unknown as RenderingContext
    );

    render(
      <GlobeTap
        promptFr="Où vivent les Yoruba"
        choices={["NGA", "ZAF"]}
        onChoose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("atlas-globe-canvas-mock")).toBeInTheDocument();
    });
    expect(document.querySelectorAll("canvas")).toHaveLength(1);
  });

  // @req REQ-119
  it("names what is absent when no proposed country resolves to committed geometry", () => {
    render(
      <GlobeTap
        promptFr="Où vivent les Yoruba"
        choices={["XYZ"]}
        onChoose={vi.fn()}
      />
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Contours non disponibles pour cette manche"
    );
    expect(
      document.querySelector("[data-atlas-target]")
    ).not.toBeInTheDocument();
  });

  // @req REQ-120
  it("enlarges every choice to the 44px thumb-tap minimum a fiche marker does not need", () => {
    const { container } = render(
      <GlobeTap
        promptFr="Où vivent les Yoruba"
        choices={["NGA", "ZAF"]}
        onChoose={vi.fn()}
      />
    );

    const stage = container.querySelector("[data-atlas-stage]");
    expect(stage?.className).toMatch(/\[&_\[data-atlas-target\]\]:min-h-11/);
    expect(stage?.className).toMatch(/\[&_\[data-atlas-target\]\]:min-w-11/);
  });
});
