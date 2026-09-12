import { ficheCopy } from "@/lib/i18n/copy/fiche";
import { getStaticPageRoute } from "@/lib/routing";
import type { Language } from "@/types/shared";

/**
 * The page saying it can be amended, at the point the reader has finished it.
 *
 * Not a chapter. It carries no `data-fiche-section`, so the reading rail does
 * not list it and the record's chapter count does not change — the charter
 * holds that list by name, and an invitation is not a chapter of an atlas.
 *
 * It also carries no heading, for the same reason and one more: this is the
 * third place on the record offering the same gesture, after the head and the
 * rail. A third heading would make an invitation compete with the country's
 * own history for the reader's eye.
 */
// @req REQ-091
export function FicheAmendBand({ language }: { language: Language }) {
  const copy = ficheCopy[language].amendable;

  return (
    <section className="afh-amend-band" data-testid="fiche-amend-band">
      <p className="afh-amend-band-lead">{copy.lead}</p>
      <p className="afh-amend-band-hint">{copy.hint}</p>
      <a
        className="afh-amend-band-action"
        href={getStaticPageRoute(language, "contribute")}
      >
        {ficheCopy[language].contribute}
      </a>
    </section>
  );
}
