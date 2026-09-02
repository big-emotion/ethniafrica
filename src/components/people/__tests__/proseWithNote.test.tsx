import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProseWithChip } from "@/components/people/ProseWithChip";
import type { ParagraphNoteData } from "@/components/people/peopleFicheNotes";

/**
 * Prose carrying a note callout.
 *
 * The pipe for an inline source mark has existed here for months and no caller
 * ever fed it, so every assertion below is about a path that has never run in
 * production.
 */

const note: ParagraphNoteData = {
  noteNumber: 3,
  anchorId: "chip-content-culture-majorrites",
  fieldLabel: "Rites majeurs",
  assertionId: "a-1",
  assertionStatement: "Les rites d'initiation structurent les classes d'âge.",
  contested: false,
  sources: [
    {
      id: "s-1",
      title: "Ethnologue",
      url: "https://ethnologue.com",
      tier: "official",
      notes: null,
      author: "SIL International",
      year: 2024,
    },
  ],
  numberBySourceId: { "s-1": 4 },
};

describe("ProseWithChip with a note", () => {
  /**
   * The number must be in the server HTML, not painted by the lazy chunk: a
   * digit appearing 300 ms late reflows the paragraph the reader is on.
   */
  // @req REQ-019
  it("renders the number immediately, before the lazy chunk arrives", () => {
    render(<ProseWithChip text="Un paragraphe sourcé." note={note} />);

    expect(screen.getByText(/\[3\]/)).toBeInTheDocument();
  });

  // @req REQ-019
  it("keeps the prose itself intact", () => {
    render(<ProseWithChip text="Un paragraphe sourcé." note={note} />);

    expect(screen.getByText(/Un paragraphe sourcé\./)).toBeInTheDocument();
  });

  /**
   * A dialog renders a div. Inside the paragraph the HTML parser closes the
   * `<p>` before it, and the server markup stops matching what the client
   * hydrates — the reason the sheet has always been mounted beside the prose.
   * With one sheet per sourced field, that invariant now has to hold a dozen
   * times per fiche.
   */
  // @req REQ-019
  it("never nests a dialog inside the paragraph", async () => {
    const { container } = render(
      <ProseWithChip text="Un paragraphe sourcé." note={note} />
    );

    await waitFor(() => {
      expect(container.querySelector("p [role='dialog']")).toBeNull();
    });
  });

  // @req REQ-019
  it("falls back to plain prose when the field carries no note", () => {
    const { container } = render(<ProseWithChip text="Sans note." />);

    expect(container.querySelector("sup")).toBeNull();
    expect(screen.getByText("Sans note.")).toBeInTheDocument();
  });

  /**
   * The anchor is derived from the field, never from the number, so a link
   * already shared keeps meaning the same passage after a chapter is inserted
   * above it.
   */
  // @req REQ-019
  it("anchors on the field rather than on the note number", () => {
    const { container } = render(
      <ProseWithChip
        text="Un paragraphe sourcé."
        note={note}
        noteAnchorId="chip-content-culture-majorrites"
      />
    );

    expect(
      container.querySelector("#chip-content-culture-majorrites")
    ).not.toBeNull();
    expect(container.querySelector("#note-3")).toBeNull();
  });
});
