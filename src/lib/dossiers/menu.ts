import {
  getDossierTranslation,
  readDossierCorpus,
} from "@/lib/dossiers/corpus";
import { getLocalizedRoute, translatePath } from "@/lib/routing";
import type { DossierRubric } from "@/lib/afrik/parsers/dossierTypes";
import type { Language } from "@/types/shared";

/**
 * One dossier as a menu entry: what a card needs, and nothing a chapter needs.
 *
 * Deliberately not the `Dossier` itself. This crosses the client boundary into
 * the header, and a dossier carries its whole narrative — chapters, sources,
 * gaps. Shipping that into every page's HTML to print eleven titles is how a
 * menu comes to weigh more than the page under it.
 */
export interface DossierMenuEntry {
  id: string;
  href: string;
  title: string;
  rubric: DossierRubric;
  offered: boolean;
  /** ISO calendar date; the menu shows the most recent of a rubric first. */
  publishedOn: string;
}

/**
 * The dossiers of the corpus, as the menu needs them, newest first.
 *
 * Server-only: it reads the corpus off disk. The header is a client component,
 * so the result travels through `DossierMenuProvider`, exactly as the module
 * availability probe does.
 *
 * Ordered here rather than in the header because "the most recent of a rubric"
 * is a property of the corpus, and two surfaces sorting the same list their own
 * way is how they come to disagree about which four are the recent ones.
 */
// @req REQ-120
export function getDossierMenuEntries(
  language: Language = "fr"
): DossierMenuEntry[] {
  const { dossiers } = readDossierCorpus();

  return dossiers
    .map((dossier) => {
      const translated =
        language === "en" ? getDossierTranslation(dossier.slug) : null;
      const frenchPath = `${getLocalizedRoute("fr", "dossiersHub")}/${dossier.slug}`;

      return {
        id: dossier.id,
        // Built from the French path rather than concatenated per locale: the
        // English slug lives in the routing table, which `translatePath` owns.
        href: translatePath("fr", language, frenchPath),
        title: translated?.dossier.title ?? dossier.title,
        rubric: dossier.rubric,
        offered: dossier.readiness === "ready",
        publishedOn: dossier.publishedOn,
      };
    })
    .sort((a, b) => b.publishedOn.localeCompare(a.publishedOn));
}

/**
 * A menu entry plus the sentence a listing prints under the title.
 *
 * Read as a prop by `DossierDirectory`, which is a client component and cannot
 * open the corpus itself. Its producer — `getDossierIndexEntries` — was the
 * dossier index page's, and that page became an axis hub on 7 September 2026
 * (brand charter §8.6), so the function went with it rather than staying
 * exported for nobody. The type stays: the prop it describes is still the way
 * a server route hands readings down, and the theme directory renders without
 * one because its own listing comes from the catalogue.
 */
export interface DossierIndexEntry extends DossierMenuEntry {
  summary: string;
}
