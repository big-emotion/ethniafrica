import { describe, expect, it } from "vitest";

import {
  CLASSIFICATION_FIELD_PATH,
  classificationStatement,
} from "../lib/classificationAssertion";
import { classificationLabels } from "@/lib/translations";

/**
 * `classification_status` was NULL on 795 of 800 peoples and all 24 families
 * while the corpus declared `contested` or `colonial-legacy` for 460 of them.
 * The loader was right to decline the write — `enforce_assertion_required`
 * (AR3, ETNI-23) refuses it without a sourced row in `assertions` — but the
 * consequence was that editorial work already done stayed invisible.
 *
 * The statement these assertions carry is read by the public: SourceChainSheet
 * prints it between guillemets. So it is the reader-facing sentence the UI
 * already uses for the badge, never a column name.
 */
describe("classificationStatement", () => {
  // @req REQ-032
  it("states the claim in the reader's words for every status the corpus uses", () => {
    for (const status of [
      "consensual",
      "contested",
      "colonial-legacy",
      "reconstructive",
    ] as const) {
      expect(classificationStatement(status)).toBe(
        classificationLabels[status].tooltip
      );
    }
  });

  // The reader-facing register forbids repository paths, JSON field paths, raw
  // PPL_/FLG_ identifiers and the pipeline's own vocabulary in anything
  // published verbatim. A statement reading "classification_status =
  // colonial-legacy" would breach all of that in one line.
  // @req REQ-032
  it("never leaks a column name, an identifier or a raw status token", () => {
    for (const status of [
      "consensual",
      "contested",
      "colonial-legacy",
      "reconstructive",
    ] as const) {
      const statement = classificationStatement(status);

      expect(statement).not.toContain("classification_status");
      expect(statement).not.toContain(status);
      expect(statement).not.toMatch(/PPL_|FLG_|content\./);
      expect(statement.length).toBeGreaterThan(20);
    }
  });

  // @req REQ-032
  it("declines to invent a sentence for a status it does not know", () => {
    expect(classificationStatement(null)).toBeNull();
    expect(classificationStatement("invented-status")).toBeNull();
  });

  // The trigger matches on this exact string. A typo here would leave the
  // assertion unread and the write still refused, with nothing to show why.
  // @req REQ-032
  it("targets the field path the database trigger actually checks", () => {
    expect(CLASSIFICATION_FIELD_PATH).toBe("classification_status");
  });
});
