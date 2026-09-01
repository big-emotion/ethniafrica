import { describe, it, expect } from "vitest";

import { ADJUDICATED_DRIFT, unadjudicatedDrift } from "../ci/adjudicatedDrift";

describe("adjudicated drift", () => {
  // The point of the list is to keep the gate meaningful, so anything not on it
  // must still fail. A list that swallowed unknown drift would be worse than no
  // gate: it would report green while the database and the files disagreed.
  // @req REQ-032
  it("still reports drift that has not been examined", () => {
    expect(unadjudicatedDrift(["099_something_new.sql"])).toEqual([
      "099_something_new.sql",
    ]);
  });

  // @req REQ-032
  it("passes over drift that has been examined and explained", () => {
    expect(
      unadjudicatedDrift(["038_user_roles_rls_recursion_fix.sql"])
    ).toEqual([]);
  });

  // @req REQ-032
  it("separates the settled from the unsettled in one pass", () => {
    expect(
      unadjudicatedDrift([
        "038_user_roles_rls_recursion_fix.sql",
        "099_something_new.sql",
      ])
    ).toEqual(["099_something_new.sql"]);
  });

  // An entry with no reason is an entry nobody can audit later; it would let a
  // real defect be silenced by adding one line.
  // @req REQ-032
  it("requires every entry to carry a date and a reason", () => {
    for (const entry of ADJUDICATED_DRIFT) {
      expect(entry.adjudicatedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(entry.reason.length).toBeGreaterThan(80);
    }
  });
});
