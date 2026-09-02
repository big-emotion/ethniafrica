import { describe, it, expect } from "vitest";

import { modulesNamedIn } from "@/test/axisModuleVocabulary";

/**
 * The four-letter floor, and the one module it silently swallowed.
 *
 * `modulesNamedIn` recognises a module by looking for its name's words inside
 * a sentence, and it drops words shorter than four letters because the lookup
 * is a substring test: a short word matches inside a longer unrelated one.
 *
 * DEC-038 renamed the patronyme module to « Nom », which is three letters, so
 * the module left the vocabulary the moment the registry was corrected — not
 * with an error, but by quietly never being recognised again. The two suites
 * that consume this helper only assert that *at least two* modules are named,
 * so both stayed green while the coverage for this one module was gone.
 *
 * These pin the exception that lets « Nom » back in, and the boundary that
 * keeps it from answering for « nommage » — which is the exact word the axis's
 * own copy uses, so a substring match would have made the helper agree with
 * every sentence about the corpus.
 */
describe("axis module vocabulary — a three-letter module name still counts", () => {
  // @req REQ-113
  it("recognises the Nom module in a sentence that names it", () => {
    expect(modulesNamedIn("atlas", "Les fiches de pays et de noms.")).toContain(
      "Noms"
    );
  });

  // @req REQ-113
  it("recognises it in the singular too", () => {
    expect(modulesNamedIn("atlas", "L'origine d'un nom.")).toContain("Noms");
  });

  // @req REQ-132
  it("does not let « nommage » stand for the Nom module", () => {
    expect(
      modulesNamedIn("atlas", "Les systèmes de nommage documentés.")
    ).not.toContain("Noms");
  });

  // @req REQ-132
  it("does not let « nombre » stand for it either", () => {
    expect(modulesNamedIn("atlas", "Le nombre de fiches.")).not.toContain(
      "Noms"
    );
  });

  // @req REQ-113
  it("keeps matching longer module names inside a sentence", () => {
    expect(
      modulesNamedIn(
        "atlas",
        "Les fiches de pays, de peuples et de familles linguistiques."
      ).length
    ).toBeGreaterThanOrEqual(3);
  });
});
