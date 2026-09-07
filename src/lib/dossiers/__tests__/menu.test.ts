import { describe, expect, it } from "vitest";

import { getDossierMenuEntries } from "@/lib/dossiers/menu";
import { readDossierCorpus } from "@/lib/dossiers/corpus";
import { DOSSIER_RUBRICS } from "@/lib/afrik/parsers/dossierTypes";

describe("the dossier corpus as menu entries (REQ-120)", () => {
  /**
   * The filing that used to be nine edits across five files.
   *
   * Pinned dossier by dossier rather than counted: a dossier landing in the
   * wrong rubric still renders, and only naming the pairs catches it. The four
   * Congo readings are deliberately not one block — they scatter across
   * Organisation and Religions, which is what filing by domain is for.
   */
  // @req REQ-120
  it("files every dossier of the corpus under its declared rubric", () => {
    const byId = Object.fromEntries(
      getDossierMenuEntries().map((entry) => [entry.id, entry.rubric])
    );

    expect(byId).toEqual({
      DOS_KONGO: "organisation",
      DOS_LUBA: "organisation",
      DOS_LUNDA: "organisation",
      DOS_SPIRITUALITES_KONGO: "religions",
      DOS_PROPORTIONS: "territoires",
      DOS_POPULATIONS: "populations",
      DOS_RESSOURCES: "economie",
    });
  });

  // The menu shows the first few of a rubric, so "first" has to mean something
  // the corpus decides. Sorted here rather than in the header, because two
  // surfaces sorting the same list their own way is how they come to disagree
  // about which four are the recent ones.
  // @req REQ-120
  it("hands the newest dossier first", () => {
    const dates = getDossierMenuEntries().map((entry) => entry.publishedOn);

    expect(dates).toEqual([...dates].sort().reverse());
  });

  // A rubric the parser accepts but the menu cannot name would render a
  // heading-less block of cards; the enum and the label table are held
  // together by `moduleGroupNames` being keyed on ModuleGroupId.
  // @req REQ-120
  it("declares no rubric outside the six the corpus knows", () => {
    for (const entry of getDossierMenuEntries()) {
      expect(DOSSIER_RUBRICS).toContain(entry.rubric);
    }
  });

  /**
   * The freeze, read off the dossier rather than off a module registry.
   *
   * Every Réalités reading is withdrawn while its editorial is reworked, so
   * the menu marks all seven **Bientôt**. This asserts the wiring, not the
   * editorial decision: when a dossier is unfrozen this test changes with it,
   * and it changes in the same file the editor edited.
   */
  // @req REQ-114
  it("reads each dossier's readiness from the dossier itself", () => {
    const { dossiers } = readDossierCorpus();
    const offeredInMenu = getDossierMenuEntries()
      .filter((entry) => entry.offered)
      .map((entry) => entry.id);
    const readyInCorpus = dossiers
      .filter((dossier) => dossier.readiness === "ready")
      .map((dossier) => dossier.id);

    expect(offeredInMenu.sort()).toEqual(readyInCorpus.sort());
  });

  // An English address carries the English slug, which lives in the routing
  // table because middleware runs on the edge and cannot read the corpus.
  // @req REQ-141
  it("gives an English reader the English address of the same dossier", () => {
    const french = getDossierMenuEntries("fr").find(
      (entry) => entry.id === "DOS_KONGO"
    );
    const english = getDossierMenuEntries("en").find(
      (entry) => entry.id === "DOS_KONGO"
    );

    // The last segment only: `routeLiteralCharter` forbids writing a module
    // path out, and a test that composed the whole address from the same slug
    // table it is checking would assert nothing anyway.
    const slugOf = (href?: string) => href?.split("/").pop();

    expect(slugOf(french?.href)).toBe("royaume-kongo");
    expect(slugOf(english?.href)).toBe("kongo-kingdom");
    expect(english?.href.startsWith("/en/")).toBe(true);
    expect(english?.title).toBe("The Kongo kingdom");
  });
});
