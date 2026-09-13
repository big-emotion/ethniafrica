import { buttonVariants } from "@/components/ui/button";
import { ficheCopy } from "@/lib/i18n/copy/fiche";
import { getStaticPageRoute } from "@/lib/routing";
import type { Language } from "@/types/shared";

/**
 * The page asking to be completed, at the point the reader has finished it.
 * Both records mount it, after their last chapter and before the way onward.
 *
 * Not a chapter. It carries no `data-fiche-section`, so the reading rail does
 * not list it and the record's chapter count does not change — the charter
 * holds that list by name, and an invitation is not a chapter of an atlas.
 *
 * It also carries no heading: this is the third place on the record offering
 * the same gesture, after the head and the rail, and a third heading would
 * make an invitation compete with the record's own chapters.
 *
 * The action is drawn by the shared accent button rather than by the
 * stylesheet, which used to hand-roll an outlined control of its own.
 */
// @req REQ-091
export function FicheAmendBand({ language }: { language: Language }) {
  const copy = ficheCopy[language].amendable;

  return (
    <section className="afh-amend-band" data-testid="fiche-amend-band">
      <p className="afh-amend-band-lead">{copy.lead}</p>
      <a
        className={buttonVariants({
          variant: "accent",
          className: "afh-amend-band-action",
        })}
        href={getStaticPageRoute(language, "contribute")}
      >
        {copy.action}
      </a>
    </section>
  );
}
