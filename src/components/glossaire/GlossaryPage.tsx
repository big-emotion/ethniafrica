import { PageLayout } from "@/components/layout/PageLayout";
import { ChapterHeading } from "@/components/pages/ChapterHeading";
import { ActionLink } from "@/components/ui/ActionLink";
import { GLOSSARY_ENTRIES } from "@/lib/glossaire/entries";
import type { GlossaryFamily } from "@/lib/glossaire/types";
import { getNommerChapterRoute } from "@/lib/routing";
import type { Language } from "@/types/shared";

const LANGUAGE: Language = "fr";

// @req REQ-144
export const GLOSSARY_PAGE_TITLE = "Glossaire";
// @req REQ-144
export const GLOSSARY_PAGE_SUBTITLE =
  "Les mots avec lesquels l'atlas nomme. Trente termes, chacun avec un exemple pris dans le corpus — ou avec la raison pour laquelle le corpus n'en a pas.";

/**
 * The three questions a reader arrives with, in the order they arrive.
 * Not sorted: the families are an argument, the terms inside them are a
 * lookup.
 */
const FAMILIES: Array<{ id: GlossaryFamily; step: string; heading: string }> = [
  {
    id: "origine",
    step: "Famille 01",
    heading: "D'où vient le nom",
  },
  {
    id: "objet",
    step: "Famille 02",
    heading: "Ce qui est nommé",
  },
  {
    id: "effet",
    step: "Famille 03",
    heading: "Ce que nommer produit",
  },
];

const CHAPTER_LABELS: Record<string, string> = {
  "le-peuple": "01 · Le peuple",
  "le-pays": "02 · Le pays",
  "la-personne": "03 · La personne",
  "la-langue": "04 · La langue",
  "la-chose": "05 · La chose",
};

/**
 * The glossary, as an index.
 *
 * Neither a filter nor a set of disclosures, and the reason is the incoming
 * anchor. A chapter links `#terme-endonyme`; if the entry were collapsed, the
 * reader would land on a heading and have to click again for the thing they
 * were promised, and if the families were filtered the anchor could point at
 * a term filtered out of the DOM entirely. A filter would break `Ctrl+F` too.
 * There is therefore nothing to deploy: every definition is always present
 * and always visible.
 *
 * The rail at the top is three anchors, not three controls — no state, no
 * JavaScript, and every term indexable.
 *
 * The components live here rather than in `src/components/pages/` on purpose:
 * that directory is the editorial/legal family, which `editorialCharter`
 * keeps free of motion because those pages are print-safe documents. A
 * glossary whose entries lift on hover is not one of them.
 */
// @req REQ-144
export const GlossaryPage = () => (
  <PageLayout
    language={LANGUAGE}
    title={GLOSSARY_PAGE_TITLE}
    subtitle={GLOSSARY_PAGE_SUBTITLE}
  >
    <div className="afh-glossaire afh-accent-teal flex flex-col gap-afh-6xl">
      <nav
        aria-label="Les trois familles"
        className="flex flex-wrap gap-afh-sm"
      >
        {FAMILIES.map((family) => (
          <a
            key={family.id}
            href={`#famille-${family.id}`}
            className="inline-flex min-h-11 items-center rounded-afh-full border border-afh-border px-afh-md text-afh-small font-semibold text-[color:var(--accent-ink)] no-underline hover:underline focus-visible:underline focus-visible:outline-none focus-visible:shadow-[var(--afh-ring-focus)]"
          >
            {family.heading}
          </a>
        ))}
      </nav>

      {FAMILIES.map((family) => {
        const entries = GLOSSARY_ENTRIES.filter(
          (entry) => entry.family === family.id
        );

        return (
          <section key={family.id} aria-labelledby={`famille-${family.id}`}>
            <ChapterHeading
              stepLabel={`${family.step} · ${entries.length} termes`}
              heading={family.heading}
              id={`famille-${family.id}`}
            />
            <div className="mt-afh-lg grid grid-cols-1 gap-afh-lg sm:grid-cols-2 lg:grid-cols-3">
              {entries.map((entry) => (
                <article
                  key={entry.id}
                  id={`terme-${entry.id}`}
                  className="flex flex-col gap-afh-xs text-left"
                >
                  <h3 className="font-afh-display text-afh-body font-semibold text-afh-text">
                    {entry.fr}
                  </h3>
                  <p className="text-afh-small text-afh-text-soft">
                    {entry.definition}
                  </p>
                  <p className="text-afh-caption text-afh-text-soft">
                    {entry.corpusPresence === "instantiated"
                      ? entry.corpusExample
                      : entry.absenceReason}
                  </p>
                  {entry.chapterRef ? (
                    <ActionLink
                      href={getNommerChapterRoute(LANGUAGE, entry.chapterRef)}
                    >
                      {`Vu dans : ${CHAPTER_LABELS[entry.chapterRef]}`}
                    </ActionLink>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  </PageLayout>
);
