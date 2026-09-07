import { describe, expect, it } from "vitest";

import { isDossierSlugPublished } from "@/lib/dossiers/publication";
import { readDossierCorpus } from "@/lib/dossiers/corpus";

/**
 * The dynamic dossier segment serves seven subjects from one route, so it
 * cannot ask the registry for "its" module the way a static page can. It
 * resolves the slug the reader typed back to the module that declares it,
 * and asks that module whether it is published.
 *
 * Written against the corpus rather than a transcribed list: a dossier added
 * to `dataset/source/afrik/dossiers/` and forgotten here would otherwise be
 * served by a route no test ever visits.
 */
describe("dossier slug publication", () => {
  // @req REQ-113
  it("withholds every dossier of the Réalités vertical while frozen", () => {
    const slugs = readDossierCorpus().dossiers.map((dossier) => dossier.slug);

    expect(slugs.length).toBeGreaterThan(0);
    for (const slug of slugs) {
      expect(isDossierSlugPublished(slug), slug).toBe(false);
    }
  });

  // A slug the corpus does not hold is a reader guessing at a URL. It gets
  // the same answer as a withdrawn one, and for the same reason.
  // @req REQ-113
  it("withholds a slug no dossier declares", () => {
    expect(isDossierSlugPublished("un-dossier-invente")).toBe(false);
  });

  // The English routes carry their own slugs, and a freeze that only covered
  // the French ones would leave the same text served one locale over.
  // @req REQ-113
  it("withholds the English slug of a withdrawn dossier", () => {
    expect(isDossierSlugPublished("kongo-kingdom")).toBe(false);
  });
});
