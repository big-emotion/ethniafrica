import { describe, it, expect } from "vitest";

import { firstDivergence } from "../migrationsDiff";

describe("firstDivergence", () => {
  // The drifted section used to print a 160-character excerpt of each side.
  // Real drift sits far past that, so both lines rendered the same prefix and
  // the reader was told to "write a migration for the difference" without ever
  // being shown one. These cover the offset that replaced it.
  // @req REQ-032
  it("reports -1 when the two statements are identical", () => {
    expect(firstDivergence("alter table sources", "alter table sources")).toBe(
      -1
    );
  });

  // @req REQ-032
  it("points at the first differing character", () => {
    expect(firstDivergence("create table a", "create table b")).toBe(13);
  });

  // @req REQ-032
  it("points past the shorter statement when one is a prefix of the other", () => {
    expect(firstDivergence("select 1", "select 1 from t")).toBe(8);
  });

  // A one-token difference thousands of characters in is the shape drift
  // actually takes — a renamed column, a changed default — and the excerpt is
  // exactly what hid it.
  // @req REQ-032
  it("finds a difference that lies well beyond the old excerpt limit", () => {
    const shared = "x".repeat(4000);
    expect(firstDivergence(`${shared}old_name`, `${shared}new_name`)).toBe(
      4000
    );
  });
});
