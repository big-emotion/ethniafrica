import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MercatorProjectionStage } from "@/components/play/MercatorProjectionStage";

function slider() {
  return screen.getByRole("slider", { name: /projection/i });
}

describe("MercatorProjectionStage — the projection, made draggable (REQ-120)", () => {
  // The reader arrives holding the Mercator map, so that is where the slider
  // starts: the gesture on offer is taking it apart, not being shown the
  // truth and asked to imagine the lie.
  // @req REQ-120
  it("opens on Mercator, stating how much it inflates", () => {
    render(<MercatorProjectionStage />);

    expect(slider()).toHaveValue("1");
    expect(screen.getByText(/4,0 fois trop grande/)).toBeInTheDocument();
  });

  // Dragging to the far end has to change the claim, not just the picture —
  // a map that redraws while the sentence stays put teaches the reader that
  // the sentence was decoration.
  // @req REQ-120
  it("retracts the claim once the reader drags to true size", () => {
    render(<MercatorProjectionStage />);

    fireEvent.change(slider(), { target: { value: "0" } });

    expect(screen.queryByText(/trop grande/)).not.toBeInTheDocument();
    expect(
      screen.getByText(/leur forme change, pas leur surface/i)
    ).toBeInTheDocument();
  });

  // @req REQ-120
  it("reports a smaller distortion at a middle position than at Mercator", () => {
    render(<MercatorProjectionStage />);

    fireEvent.change(slider(), { target: { value: "0.5" } });

    expect(screen.getByText(/2,5 fois trop grande/)).toBeInTheDocument();
  });

  // The map carries the whole argument, so it is announced rather than
  // hidden — and what it announces changes with the slider, like the prose.
  // @req REQ-120
  it("names the map for assistive technology at both ends", () => {
    render(<MercatorProjectionStage />);

    expect(
      screen.getByRole("img", { name: /Planisphère de Mercator/i })
    ).toBeInTheDocument();

    fireEvent.change(slider(), { target: { value: "0" } });

    expect(
      screen.getByRole("img", { name: /surfaces vraies/i })
    ).toBeInTheDocument();
  });

  // The world path excludes Africa, so both assets have to be drawn or the
  // continent this atlas is about is a hole in the middle of the map.
  // @req REQ-120
  it("draws the world, Africa and the indicatrices", () => {
    const { container } = render(<MercatorProjectionStage />);

    expect(
      container.querySelectorAll(".mercator-stage-land").length
    ).toBeGreaterThan(50);
    expect(
      container.querySelectorAll(".mercator-stage-land--africa").length
    ).toBeGreaterThan(50);
    expect(container.querySelectorAll(".mercator-stage-tissot")).toHaveLength(
      25
    );
  });

  // Every path is redrawn from the blend, so none may keep the geometry it
  // was first rendered with.
  // @req REQ-120
  it("redraws the geometry when the slider moves", () => {
    const { container } = render(<MercatorProjectionStage />);
    const before = container
      .querySelector(".mercator-stage-tissot")
      .getAttribute("d");

    fireEvent.change(slider(), { target: { value: "0" } });

    expect(
      container.querySelector(".mercator-stage-tissot").getAttribute("d")
    ).not.toBe(before);
  });
});
