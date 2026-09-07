import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getDossierBySlug } from "../corpus";
import { applyDossierTranslation } from "../translation";

const source = getDossierBySlug("royaume-kongo")!;
const overlay = () =>
  JSON.parse(
    readFileSync("dataset/translations/en/dossiers/DOS_KONGO.json", "utf8")
  );

describe("dossier translation validation", () => {
  // @req REQ-143
  it("overlays prose while retaining source identifiers", () => {
    expect(applyDossierTranslation(source, overlay())?.title).toBe(
      "The Kongo kingdom"
    );
    expect(applyDossierTranslation(source, overlay())?.id).toBe(source.id);
  });
  // @req REQ-143
  it("refuses stale sources, missing provenance and changed invariants", () => {
    expect(
      applyDossierTranslation({ ...source, title: "Changed" }, overlay())
    ).toBeNull();
    expect(applyDossierTranslation(source, { title: "English" })).toBeNull();
    expect(
      applyDossierTranslation(source, { ...overlay(), id: "DOS_OTHER" })
    ).toBeNull();
  });
  // @req REQ-143
  it("refuses machine translations of review-required values and untracked prose", () => {
    expect(
      applyDossierTranslation(source, {
        ...overlay(),
        thesis: { figures: [{ value: "1483" }] },
      })
    ).toBeNull();
    const incomplete = overlay();
    delete incomplete.chapters;
    expect(applyDossierTranslation(source, incomplete)).toBeNull();
    const untracked = overlay();
    untracked._translation.fieldHashes =
      {} as typeof untracked._translation.fieldHashes;
    expect(applyDossierTranslation(source, untracked)).toBeNull();
  });
});
