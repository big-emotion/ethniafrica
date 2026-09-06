import { recordLeaves, valueAt } from "@/lib/i18n/modelLeafPaths";
import { classOf } from "@/lib/i18n/translationClasses";
import { getSiteTreePaths } from "@/lib/siteTree";
import { deriveTrail } from "@/lib/navigation/deriveTrail";
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
  it("links the same history to explicitly associated countries and peoples only", () => {
    const links = (kind: "country" | "people", id: string, section: string) =>
      getFicheDossiers({ kind, id, section });
    expect(links("country", "COD", "kingdom:Royaume Kongo")[0]?.href).toBe(
      getLocalizedRoute("fr", "dossierKongo")
    );
    expect(links("country", "AGO", "kingdom:Royaume Kongo")[0]?.id).toBe(
      "dossier-kongo"
    );
    expect(links("country", "ZMB", "kingdom:Royaume Kongo")).toEqual([]);
    expect(links("country", "COD", "kingdom:Kongo imaginaire")).toEqual([]);
    expect(links("people", "PPL_KONGO", "history")[0]?.id).toBe(
      "dossier-kongo"
    );
    expect(links("people", "PPL_LUBA", "culture")).toEqual([]);
    expect(links("people", "PPL_KONGO", "culture")[0]?.id).toBe(
      "dossier-spiritualites-kongo"
    );
  });
  // @req REQ-114
  it("opens the spiritualities theme and keeps unpublished formations unlinked", () => {
    expect(
      getDossiers({ theme: "spiritualites" }).map((entry) => entry.id)
    ).toContain("dossier-spiritualites-kongo");
    expect(
      getFicheDossiers({
        kind: "country",
        id: "COD",
        section: "kingdom:Chefferies Mongo",
      })
    ).toEqual([]);
  });
  // @req REQ-114 @req REQ-140
  it("lists each locale route in the sitemap and returns through its primary theme", () => {
    for (const language of ["fr", "en"] as const) {
      for (const entry of getDossiers({ language }).filter((d) =>
        d.id.startsWith("dossier-")
      )) {
        expect(getSiteTreePaths(language)).toContain(entry.href);
        expect(
          deriveTrail(entry.href).some((crumb) =>
            crumb.href?.endsWith(`/themes/${entry.primaryTheme}`)
          )
        ).toBe(true);
      }
    }
  });
});
