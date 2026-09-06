import { PageLayout } from "@/components/layout/PageLayout";
import { ChapterHeading } from "@/components/pages/ChapterHeading";
import { ActionLink } from "@/components/ui/ActionLink";
import { GLOSSARY_ENTRIES } from "@/lib/glossaire/entries";
import { getLocalizedNommerChapters } from "@/lib/dossiers/nommer/localizeChapter";
import { glossaryPageCopy } from "@/lib/i18n/copy/glossaryPage";
import { getNommerChapterRoute } from "@/lib/routing";
import type { Language } from "@/types/shared";

// @req REQ-144
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
export const GlossaryPage = ({ language }: { language: Language }) => {
  const copy = glossaryPageCopy[language];
  const chapterLabels = Object.fromEntries(
    getLocalizedNommerChapters(language).map((chapter) => [
      chapter.key,
      `${chapter.ordinal} · ${chapter.title}`,
    ])
  );

  return (
    <PageLayout
      language={language}
      title={copy.title}
      subtitle={copy.subtitle(GLOSSARY_ENTRIES.length)}
    >
      <div className="afh-glossaire afh-accent-teal flex flex-col gap-afh-6xl">
        {copy.fallback ? (
          <p role="status" aria-label={copy.fallback}>
            {copy.fallback}
          </p>
        ) : null}
        <nav
          aria-label={copy.familiesLabel}
          className="flex flex-wrap gap-afh-sm"
        >
          {copy.families.map((family) => (
            <a
              key={family.id}
              href={`#famille-${family.id}`}
              className="inline-flex min-h-11 items-center rounded-afh-full border border-afh-border px-afh-md text-afh-small font-semibold text-[color:var(--accent-ink)] no-underline hover:underline focus-visible:underline focus-visible:outline-none focus-visible:shadow-[var(--afh-ring-focus)]"
            >
              {family.heading}
            </a>
          ))}
        </nav>

        {copy.families.map((family) => {
          const entries = GLOSSARY_ENTRIES.filter(
            (entry) => entry.family === family.id
          );

          return (
            <section key={family.id} aria-labelledby={`famille-${family.id}`}>
              <ChapterHeading
                stepLabel={`${family.step} · ${copy.familyCount(entries.length)}`}
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
                      {language === "en" ? entry.en : entry.fr}
                    </h3>
                    <p
                      className="text-afh-small text-afh-text-soft"
                      lang={language === "en" ? "fr" : undefined}
                    >
                      {entry.definition}
                    </p>
                    <p
                      className="text-afh-caption text-afh-text-soft"
                      lang={language === "en" ? "fr" : undefined}
                    >
                      {entry.corpusPresence === "instantiated"
                        ? entry.corpusExample
                        : entry.absenceReason}
                    </p>
                    {entry.chapterRef ? (
                      <ActionLink
                        href={getNommerChapterRoute(language, entry.chapterRef)}
                      >
                        {`${copy.seenIn}: ${chapterLabels[entry.chapterRef]}`}
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
};
