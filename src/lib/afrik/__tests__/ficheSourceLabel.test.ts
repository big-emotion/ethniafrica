import { describe, expect, it } from "vitest";

import {
  FICHE_SOURCE_TIER_LABELS_FR,
  ficheSourceLabel,
  ficheSourceTierLabel,
  ficheSources,
} from "@/lib/afrik/ficheSourceLabel";
import type { FicheSource } from "@/types/afrik";

const source = (over: Partial<FicheSource> = {}): FicheSource => ({
  title: "SIL Ethnologue (2024)",
  url: "https://www.ethnologue.com/",
  tier: "official",
  ...over,
});

describe("fiche source tier labels", () => {
  // 605 of the corpus's 4 238 sources carry needs_review — a source nobody has
  // judged yet. Folding it into "Non vérifiée" states a verdict no one
  // reached, which is the opposite of what the tier policy is for.
  // @req REQ-092
  it("gives a source awaiting review a label of its own", () => {
    expect(ficheSourceTierLabel("needs_review")).toBe("En attente d'examen");
    expect(ficheSourceTierLabel("needs_review")).not.toBe(
      ficheSourceTierLabel("unverified")
    );
  });

  // @req REQ-092
  it("labels the three authority tiers as the policy names them", () => {
    expect(ficheSourceTierLabel("official")).toBe("Officielle");
    expect(ficheSourceTierLabel("referenced")).toBe("Référencée");
    expect(ficheSourceTierLabel("unverified")).toBe("Non vérifiée");
  });

  // strictNullChecks is off in this repo, so a tier the map does not cover
  // reads as undefined and renders as literally nothing on the page.
  // @req REQ-092
  it("never renders nothing for a tier it does not recognise", () => {
    expect(ficheSourceTierLabel(undefined)).toBe("En attente d'examen");
    expect(ficheSourceTierLabel("tier-1" as never)).toBe("En attente d'examen");
  });

  // @req REQ-092
  it("covers every tier a fiche source may carry", () => {
    expect(Object.keys(FICHE_SOURCE_TIER_LABELS_FR).sort()).toEqual([
      "needs_review",
      "official",
      "referenced",
      "unverified",
    ]);
  });
});

describe("ficheSources", () => {
  // ficheSourceLine joined every entry into one "·"-separated string, so tier,
  // url and notes were destroyed before any component could show them. No tier
  // chip was possible on a people fiche while that held.
  // @req REQ-001
  it("keeps title, url, tier and notes intact through to the caller", () => {
    const [first] = ficheSources([
      source({ notes: "Croisé avec les recensements nationaux" }),
    ]);

    expect(first).toEqual({
      title: "SIL Ethnologue (2024)",
      url: "https://www.ethnologue.com/",
      tier: "official",
      tierLabel: "Officielle",
      notes: "Croisé avec les recensements nationaux",
    });
  });

  // The corpus in git holds structured entries; the database still serves the
  // bare strings it was loaded from. Both shapes are live at once.
  // @req REQ-001
  it("accepts a bare string, at the tier of a source nobody has judged", () => {
    const [first] = ficheSources(["- Rapport UNFPA 2023 "]);

    expect(first.title).toBe("Rapport UNFPA 2023");
    expect(first.url).toBeNull();
    expect(first.tier).toBe("needs_review");
  });

  // @req REQ-001
  it("drops an entry carrying no usable text rather than rendering an empty row", () => {
    expect(ficheSources([source({ title: "  " }), source()])).toHaveLength(1);
    expect(ficheSources(undefined)).toEqual([]);
    expect(ficheSources(null)).toEqual([]);
  });

  // @req REQ-001
  it("leaves ficheSourceLabel's single-entry contract alone", () => {
    expect(ficheSourceLabel("- Rapport UNFPA 2023")).toBe("Rapport UNFPA 2023");
    expect(ficheSourceLabel(null)).toBeNull();
  });
});
