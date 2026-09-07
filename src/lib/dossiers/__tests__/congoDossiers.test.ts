import { recordLeaves, valueAt } from "@/lib/i18n/modelLeafPaths";
import { classOf } from "@/lib/i18n/translationClasses";
import { getSiteTreePaths } from "@/lib/siteTree";
import { describe, expect, it } from "vitest";
import { readDossierCorpus, getDossierBySlug } from "../corpus";
import { getDossiers, getFicheDossiers } from "../catalog";
import { getLocalizedRoute } from "@/lib/routing";

const slugs = [
  "royaume-kongo",
  "empire-luba",
  "empire-lunda",
  "spiritualites-kongo",
];

describe("Congo history dossiers", () => {
  // @req REQ-114
  it("publishes four strict dossiers with two sourced and illustrated chapters", () => {
    expect(readDossierCorpus().errors).toEqual([]);
    for (const slug of slugs) {
      const dossier = getDossierBySlug(slug);
      expect(dossier, slug).not.toBeNull();
      expect(dossier!.chapters).toHaveLength(2);
      expect(dossier!.sources.length).toBeGreaterThanOrEqual(2);
      for (const chapter of dossier!.chapters) {
        expect(chapter.illustration?.filePage).toMatch(/^https:\/\//);
        expect(chapter.readings.map((reading) => reading.stance)).toEqual([
          "official",
          "counter",
        ]);
        expect(chapter.body.every((block) => block.sourceRefs.length > 0)).toBe(
          true
        );
      }
    }
  });
  // @req REQ-140 @req REQ-143
  it("reads English prose while preserving stable keys and original source titles", () => {
    for (const slug of slugs) {
      const fr = getDossierBySlug(slug);
      const en = getDossierBySlug(slug, "en");
      expect(en, slug).not.toBeNull();
      expect(en!.title).not.toBe(fr!.title);
      expect(en!.id).toBe(fr!.id);
      for (const leaf of recordLeaves(fr)) {
        if (
          classOf("modele-dossier.json", leaf.modelPath) === "translatable" &&
          typeof leaf.value === "string"
        ) {
          expect(valueAt(en, leaf.segments), leaf.modelPath).not.toBe(
            leaf.value
          );
        }
      }
      expect(en!.sources.map((source) => source.title)).toEqual(
        fr!.sources.map((source) => source.title)
      );
      expect(en!.thesis.figures.map((figure) => figure.value)).toEqual(
        fr!.thesis.figures.map((figure) => figure.value)
      );
    }
  });
  // @req REQ-114
  /**
   * The four histories are written, sourced and illustrated — the tests above
   * still read them straight from the corpus. What the freeze withdraws is
   * every way in, and these three hold that the withdrawal is total: no fiche
   * offers them, no theme opens on them, no sitemap advertises them.
   */
  // @req REQ-114
  it("links no fiche to a withdrawn history", () => {
    const links = (kind: "country" | "people", id: string, section: string) =>
      getFicheDossiers({ kind, id, section });

    expect(links("country", "COD", "kingdom:Royaume Kongo")).toEqual([]);
    expect(links("country", "AGO", "kingdom:Royaume Kongo")).toEqual([]);
    expect(links("people", "PPL_KONGO", "history")).toEqual([]);
    expect(links("people", "PPL_KONGO", "culture")).toEqual([]);
  });

  // @req REQ-114
  it("opens no theme on a withdrawn history", () => {
    expect(getDossiers({ theme: "spiritualites" })).toEqual([]);
    expect(getDossiers({ theme: "pouvoirs" })).toEqual([]);
  });

  /**
   * Stated over the corpus rather than over `getDossiers()`, which the freeze
   * empties: iterating an empty list would pass this without checking a
   * single address, and a green that asserts nothing is the one failure a
   * suite cannot report.
   */
  // @req REQ-114 @req REQ-140
  it("advertises no withdrawn dossier in either locale's sitemap", () => {
    const withdrawn = readDossierCorpus().dossiers.map(
      (dossier) => dossier.slug
    );
    expect(withdrawn.length).toBeGreaterThan(0);

    for (const language of ["fr", "en"] as const) {
      const paths = getSiteTreePaths(language);
      const hub = getLocalizedRoute(language, "dossiersHub");
      for (const slug of withdrawn) {
        expect(paths, `${language}/${slug}`).not.toContain(`${hub}/${slug}`);
      }
    }
  });
});
