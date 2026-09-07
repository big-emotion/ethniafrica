import { getDossierThemeHref } from "@/lib/dossiers/themes";
import { getLocalizedRoute } from "@/lib/routing";
import { describe, expect, it } from "vitest";
import { deriveTrail } from "@/lib/navigation/deriveTrail";

describe("dossier theme trails", () => {
  /**
   * The freeze's sharpest edge, and the one that does not announce itself.
   *
   * Anecdotes stays published, so its trail keeps rendering — and it used to
   * hang a "Noms et identités" crumb off the theme its dossier declares. That
   * theme is no longer published, so the crumb was a link from a live page to
   * a 404: the freeze leaking onto the one surface it was meant to spare.
   *
   * A crumb is offered for a theme the reader can actually open, or not at
   * all.
   */
  // @req REQ-091
  it("hangs no theme crumb off a live page while the themes are withdrawn", () => {
    const trail = deriveTrail(getLocalizedRoute("fr", "anecdotes"));

    expect(trail).toEqual([
      { label: "Accueil", href: "/fr" },
      { label: "Les dossiers", href: getLocalizedRoute("fr", "dossiersHub") },
      { label: "Anecdotes" },
    ]);
    expect(trail.some((crumb) => crumb.href?.includes("/themes/"))).toBe(false);
  });

  // @req REQ-140
  it("keeps the English trail on English dossier routes", () => {
    const trail = deriveTrail(getLocalizedRoute("en", "anecdotes"));

    expect(
      trail.every((crumb) => !crumb.href || crumb.href.startsWith("/en"))
    ).toBe(true);
    expect(trail.some((crumb) => crumb.href?.includes("/themes/"))).toBe(false);
  });

  // A theme page still labels itself from its own path — it is the crumb's
  // *link* the freeze withdraws, not the vocabulary.
  // @req REQ-091
  it("returns from a theme to the dossier directory without a redundant level", () => {
    expect(deriveTrail(getDossierThemeHref("noms"))).toEqual([
      { label: "Accueil", href: "/fr" },
      { label: "Les dossiers", href: getLocalizedRoute("fr", "dossiersHub") },
      { label: "Noms et identités" },
    ]);
  });
});
