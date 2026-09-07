import { describe, expect, it } from "vitest";

import { PRODUCT_NAME } from "@/lib/brand";
import {
  FICHE_TITLE_MAX_LENGTH,
  FICHE_DESCRIPTION_MAX_LENGTH,
  buildFicheHead,
  type FicheSubject,
} from "@/lib/seo/ficheMetadata";
import type { FicheKind } from "@/lib/seo/ficheCanonical";

/**
 * What a fiche owes a search result and a shared link.
 *
 * Measured on production 2026-09-07: all 3 242 sitemap URLs served the root
 * layout's title, description and Open Graph card, because `ficheCanonical`
 * answered the crawler head without ever naming the fiche. Google had sent
 * 12 visitors in the site's lifetime. These assertions are the floor that
 * regression cannot go back under — a fiche that names nothing is
 * indistinguishable from the 3 241 others.
 */

const SUBJECTS: Record<FicheKind, FicheSubject> = {
  people: { name: "Fon", familyName: "Gbe", countryNames: ["Bénin", "Togo"] },
  peopleLinks: { name: "Fon", familyName: "Gbe", countryNames: ["Bénin"] },
  country: { name: "Bénin", peopleCount: 24 },
  family: { name: "Krou", peopleCount: 31 },
  language: { name: "Lingala", familyName: "Bantou" },
  name: { name: "Keïta", peopleNames: ["Mandingues"] },
};

const KINDS = Object.keys(SUBJECTS) as FicheKind[];

describe("fiche metadata charter", () => {
  // @req REQ-091
  it("names the fiche in the title of every kind", () => {
    for (const kind of KINDS) {
      const { title } = buildFicheHead(kind, "fr", SUBJECTS[kind]);
      expect(title, kind).toContain(SUBJECTS[kind].name);
    }
  });

  // @req REQ-091
  it("gives each kind of fiche a distinct title for the same name", () => {
    const shared: FicheSubject = { name: "Bamana" };
    const titles = KINDS.map(
      (kind) => buildFicheHead(kind, "fr", shared).title
    );
    expect(new Set(titles).size).toBe(titles.length);
  });

  // @req REQ-091
  it("never falls back to the site-wide title", () => {
    for (const kind of KINDS) {
      const { title } = buildFicheHead(kind, "fr", SUBJECTS[kind]);
      expect(title, kind).not.toBe(PRODUCT_NAME);
      expect(title.length, kind).toBeGreaterThan(PRODUCT_NAME.length);
    }
  });

  // @req REQ-091
  it("keeps titles inside the length a search result renders", () => {
    const longest: FicheSubject = {
      name: "Africains d'origine récente",
      familyName: "Niger-Congo atlantique",
      countryNames: ["République démocratique du Congo", "Centrafrique"],
    };
    for (const kind of KINDS) {
      const { title } = buildFicheHead(kind, "fr", longest);
      expect(title.length, `${kind}: ${title}`).toBeLessThanOrEqual(
        FICHE_TITLE_MAX_LENGTH
      );
    }
  });

  // @req REQ-091
  it("keeps descriptions inside the length a search result renders", () => {
    const verbose: FicheSubject = {
      name: "Bassa",
      summary: "Lorem ".repeat(80),
      familyName: "Bantou",
      countryNames: ["Cameroun"],
    };
    for (const kind of KINDS) {
      const { description } = buildFicheHead(kind, "fr", verbose);
      expect(description.length, kind).toBeLessThanOrEqual(
        FICHE_DESCRIPTION_MAX_LENGTH
      );
    }
  });

  // @req REQ-091
  it("prefers the corpus summary over the composed sentence", () => {
    const summary = "Le royaume du Danxomè fédère les Fon au XVIIe siècle.";
    const { description } = buildFicheHead("people", "fr", {
      name: "Fon",
      summary,
    });
    expect(description).toBe(summary);
  });

  /**
   * The reader-facing register (CLAUDE.md): a title and a description are
   * published verbatim, so they may carry no corpus identifier and none of
   * the workshop's own vocabulary. 774 name fiches once told their visitors
   * which queue they came from.
   */
  // @req REQ-091
  it("keeps corpus identifiers and pipeline vocabulary out of the head", () => {
    const leaky: FicheSubject = {
      name: "PPL_FON",
      familyName: "FLG_GBE",
      countryNames: ["BEN"],
      summary: "Fiche en file d'attente, tier hérité, revue claim-level.",
    };
    for (const kind of KINDS) {
      const head = buildFicheHead(kind, "fr", leaky);
      const text = `${head.title} ${head.description}`;
      expect(text, kind).not.toMatch(/\b(PPL|FLG|PAT)_/);
      expect(text, kind).not.toMatch(
        /file d'attente|la passe|protocole de recherche|revue claim-level|tier hérité/i
      );
    }
  });

  /**
   * Pinned rather than derived: these are the strings a reader sees in a
   * search result, and a template change that reads worse should have to be
   * argued for in a diff rather than pass silently.
   */
  // @req REQ-091
  it("renders the titles the fiches carried on 2026-09-07", () => {
    const rendered = KINDS.map(
      (kind) => buildFicheHead(kind, "fr", SUBJECTS[kind]).title
    );
    expect(rendered).toEqual([
      "Fon — peuple (Bénin, Togo) | EthniAfrica",
      "Fon — liens et parentés | EthniAfrica",
      "Bénin — peuples et langues | EthniAfrica",
      "Krou — famille linguistique | EthniAfrica",
      "Lingala — langue (Bantou) | EthniAfrica",
      "Keïta — origine et histoire du nom | EthniAfrica",
    ]);
  });

  // @req REQ-091
  it("still names the fiche when the corpus fills nothing but the name", () => {
    for (const kind of KINDS) {
      const head = buildFicheHead(kind, "fr", { name: "Dei" });
      expect(head.title, kind).toContain("Dei");
      expect(head.description.length, kind).toBeGreaterThan(0);
    }
  });
});
