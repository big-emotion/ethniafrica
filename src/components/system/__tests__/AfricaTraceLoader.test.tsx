import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  AfricaTraceLoader,
  LOADER_REVEAL_DELAY_MS,
} from "@/components/system/AfricaTraceLoader";
import { AFRICA_LANDMASS_PATH } from "@/lib/atlas/assets/africaLandmassPath";

describe("AfricaTraceLoader (REQ-104 — a loading surface in the shared design system)", () => {
  // @req REQ-104
  it("announces the wait to assistive technology with the label it was given", () => {
    render(<AfricaTraceLoader label="Chargement de la fiche peuple" />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Chargement de la fiche peuple"
    );
  });

  // @req REQ-104
  it("inks the committed Africa geometry rather than a figure of its own", () => {
    const { container } = render(<AfricaTraceLoader label="Chargement" />);

    const drawn = Array.from(container.querySelectorAll("path")).map((path) =>
      path.getAttribute("d")
    );

    expect(drawn.length).toBeGreaterThan(0);
    expect(new Set(drawn)).toEqual(new Set([AFRICA_LANDMASS_PATH]));
  });

  // @req REQ-104
  it("holds itself invisible until the wait is long enough to be worth reporting", () => {
    const { container } = render(<AfricaTraceLoader label="Chargement" />);
    const styleSheet = container.querySelector("style")?.textContent ?? "";

    expect(LOADER_REVEAL_DELAY_MS).toBeGreaterThanOrEqual(200);
    expect(LOADER_REVEAL_DELAY_MS).toBeLessThan(1000);
    expect(styleSheet).toContain(`${LOADER_REVEAL_DELAY_MS}ms`);
    // `both` is what keeps the figure at zero opacity through the delay:
    // without it the reveal starts painted and the delay buys nothing.
    expect(styleSheet).toMatch(/animation:[^;]*both/);
  });

  // @req REQ-104
  it("takes its durations and easings from the motion tokens, never from literals", () => {
    const { container } = render(<AfricaTraceLoader label="Chargement" />);
    const styleSheet = container.querySelector("style")?.textContent ?? "";

    expect(styleSheet).toContain("var(--afh-duration-fade)");
    expect(styleSheet).toContain("var(--afh-ease-out)");
    expect(styleSheet).toContain("var(--afh-ease-in-out)");
  });

  // @req REQ-104
  it("takes its colours from tokens, so the accent scope it sits in drives the ink", () => {
    const { container } = render(<AfricaTraceLoader label="Chargement" />);
    const styleSheet = container.querySelector("style")?.textContent ?? "";

    expect(styleSheet).toContain("var(--accent)");
    expect(styleSheet).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(styleSheet).not.toMatch(/\brgba?\(/);
  });

  // @req REQ-104
  it("stops moving under prefers-reduced-motion, leaving the continent fully inked", () => {
    const { container } = render(<AfricaTraceLoader label="Chargement" />);
    const styleSheet = container.querySelector("style")?.textContent ?? "";

    expect(styleSheet).toContain("prefers-reduced-motion: reduce");
    const reducedBlock = styleSheet.slice(
      styleSheet.indexOf("prefers-reduced-motion: reduce")
    );
    expect(reducedBlock).toContain("animation: none");
    // clip-path is what carries the rise, so it is what has to be released:
    // an un-neutralised inset would freeze the continent half-inked.
    expect(reducedBlock).toContain("clip-path: none");
  });
});
