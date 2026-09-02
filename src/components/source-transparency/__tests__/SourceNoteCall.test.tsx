import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SourceNoteCall } from "@/components/source-transparency/SourceNoteCall";

/**
 * The inline mark that turns a sourced field into a citation.
 *
 * Deliberately not `ConfidenceChip`, which occupies the same character
 * position. The chip states a verdict — "85 % · 3 sources · vérifié le …" —
 * and degrades to a text link the moment any of those three is null, which on
 * this corpus is almost always, because `last_human_audit_at` is unset nearly
 * everywhere. A note callout must never degrade: it exists because sources
 * exist, and it says only which ones.
 */

describe("SourceNoteCall", () => {
  // @req REQ-019
  it("prints the number the bibliography gave the source", () => {
    render(
      <SourceNoteCall
        number={3}
        anchorId="chip-content-culture-majorrites"
        fieldLabel="Rites majeurs"
        onOpen={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: /note 3/i })).toHaveTextContent(
      "[3]"
    );
  });

  // @req REQ-019
  it("names the field it belongs to, so the mark is not a bare number to a screen reader", () => {
    render(
      <SourceNoteCall
        number={3}
        anchorId="chip-x"
        fieldLabel="Rites majeurs"
        onOpen={vi.fn()}
      />
    );

    expect(
      screen.getByRole("button", { name: /Rites majeurs/ })
    ).toBeInTheDocument();
  });

  /**
   * The anchor is content-addressed, never `note-3`: a shared `#chip-…` link
   * has to keep meaning the same passage after a chapter is added above it.
   */
  // @req REQ-019
  it("carries the anchor a shared link lands on", () => {
    render(
      <SourceNoteCall
        number={1}
        anchorId="chip-content-culture-symbols"
        fieldLabel="Symboles"
        onOpen={vi.fn()}
      />
    );

    expect(screen.getByRole("button")).toHaveAttribute(
      "id",
      "chip-content-culture-symbols"
    );
  });

  /**
   * A superscript is a few pixels tall. The target is grown with an absolutely
   * positioned overlay rather than with padding, because padding on an inline
   * element inside prose pushes the line box and breaks the paragraph's
   * leading at 430 px.
   */
  // @req REQ-019
  it("reaches a thumb without pushing the line it sits in", () => {
    render(
      <SourceNoteCall
        number={1}
        anchorId="chip-x"
        fieldLabel="Symboles"
        onOpen={vi.fn()}
      />
    );

    const button = screen.getByRole("button");
    expect(button.className).toContain("after:absolute");
    expect(button.className).not.toMatch(/\bpy-\d/);
  });

  // @req REQ-019
  it("opens the source chain when activated", async () => {
    const onOpen = vi.fn();
    render(
      <SourceNoteCall
        number={1}
        anchorId="chip-x"
        fieldLabel="Symboles"
        onOpen={onOpen}
      />
    );

    screen.getByRole("button").click();

    expect(onOpen).toHaveBeenCalledOnce();
  });

  /**
   * `assertions.confidence_level` records a contested claim. The mark says so
   * without changing what it is — a dotted underline, not a second colour, so
   * the page's one accent keeps meaning one thing.
   */
  // @req REQ-019
  it("marks a contested assertion as data rather than as decoration", () => {
    render(
      <SourceNoteCall
        number={2}
        anchorId="chip-x"
        fieldLabel="Symboles"
        contested
        onOpen={vi.fn()}
      />
    );

    expect(screen.getByRole("button")).toHaveAttribute(
      "data-contested",
      "true"
    );
  });

  // @req REQ-019
  it("sits in a superscript, which is what a note callout is", () => {
    const { container } = render(
      <SourceNoteCall
        number={7}
        anchorId="chip-x"
        fieldLabel="Symboles"
        onOpen={vi.fn()}
      />
    );

    expect(container.querySelector("sup button")).not.toBeNull();
  });
});
