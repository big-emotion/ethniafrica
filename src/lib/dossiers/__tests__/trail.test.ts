import { getDossierThemeHref } from "@/lib/dossiers/themes";
import { getLocalizedRoute } from "@/lib/routing";
import { describe, expect, it } from "vitest";
import { deriveTrail } from "@/lib/navigation/deriveTrail";

describe("dossier theme trails", () => {
  // @req REQ-140
  it("keeps the English trail on English theme and dossier routes", () => {
    const trail = deriveTrail(getLocalizedRoute("en", "nommer"));
    expect(trail).toContainEqual({
      label: "Names and identities",
      href: getDossierThemeHref("noms", "en"),
    });
    expect(
      trail.every((crumb) => !crumb.href || crumb.href.startsWith("/en"))
    ).toBe(true);
  });
  // @req REQ-091
  it("returns from a theme to the dossier directory without a redundant level", () => {
    expect(deriveTrail(getDossierThemeHref("noms"))).toEqual([
      { label: "Accueil", href: "/fr" },
      { label: "Les dossiers", href: getLocalizedRoute("fr", "dossiersHub") },
      { label: "Noms et identités" },
    ]);
  });
  // @req REQ-091
  it("uses the primary theme when a dossier is reached by another theme", () => {
    expect(deriveTrail(getLocalizedRoute("fr", "nommer"))).toEqual([
      { label: "Accueil", href: "/fr" },
      { label: "Les dossiers", href: getLocalizedRoute("fr", "dossiersHub") },
      { label: "Noms et identités", href: getDossierThemeHref("noms") },
      { label: "Nommer" },
    ]);
  });
});
