import { DossierChapterBlock } from "@/components/dossiers/DossierChapterBlock";
import { PageLayout } from "@/components/layout/PageLayout";
import { ChapterHeading } from "@/components/pages/ChapterHeading";
import type { Dossier } from "@/lib/afrik/parsers/dossierTypes";
import { SOURCE_TIER_LABELS } from "@/lib/glossaire/vocabularies";
import type { Language } from "@/types/shared";

/**
 * The one dossier page. Every dossier renders through this, and no dossier
 * brings a page of its own.
 *
 * Written as one template rather than one page per subject because the axis
 * had already started to fork: the Nommer pillar, the anecdote reader, the
 * migration frieze and the colonisation page each composed their own bands,
 * and a reader moving between two of them met two different documents. What a
 * dossier is — a thesis, chapters, two readings per chapter, the sources — is
 * a property of the axis, not of the subject.
 *
 * **One accent, and it is the axis's.** Brand charter §5.2: a page has one
 * accent, set once at page level, and three sibling blocks of the same kind
 * take it rather than rotating through the palette. Three dossiers are three
 * pages of the same kind, so all three take the Dossiers teal. Giving each its
 * own hue would teach a code that changes with position, which a reader reads
 * as decoration because it cannot be learned.
 *
 * **The title takes the ink, not the gradient.** §5.3 reserves the brand
 * gradient for a page that names an axis — « Les dossiers » — and rules that a
 * page naming a subject takes --afh-text. « Les vraies proportions » names a
 * subject.
 */

export interface DossierPageProps {
  dossier: Dossier;
  language: Language;
}

// @req REQ-113
export function DossierPage({ dossier, language }: DossierPageProps) {
  return (
    <PageLayout
      language={language}
      subtitle={dossier.standfirst}
      title={dossier.title}
      trailLabel={dossier.title}
    >
      <div className="afh-accent-teal afh-dossier">
        <section aria-labelledby={`${dossier.slug}-these`}>
          <ChapterHeading
            heading={dossier.thesis.heading}
            id={`${dossier.slug}-these`}
            stepLabel={dossier.thesis.stepLabel}
          />
          <ul className="afh-dossier-thesis">
            {dossier.thesis.figures.map((figure) => (
              <li className="afh-dossier-thesis-figure" key={figure.figureKey}>
                {/* A key figure set at h1 inside a <p> — typography charter
                    §3, case 1. It is a number, not a section, and marking it
                    up as a heading would put three of them above every
                    chapter title on the page. */}
                <p className="afh-dossier-thesis-value">{figure.value}</p>
                <p className="afh-dossier-thesis-claim">{figure.claim}</p>
                <p className="afh-dossier-thesis-provenance">
                  {`${figure.provenance} · ${figure.year}`}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby={`${dossier.slug}-dossier`}>
          <ChapterHeading
            heading={dossier.question}
            id={`${dossier.slug}-dossier`}
            stepLabel="Le dossier"
          />
          <div className="afh-dossier-chapters">
            {dossier.chapters.map((chapter, index) => (
              <DossierChapterBlock
                chapter={chapter}
                index={index}
                key={chapter.chapterKey}
              />
            ))}
          </div>
        </section>

        {dossier.gaps.length > 0 ? (
          <section aria-labelledby={`${dossier.slug}-limites`}>
            <ChapterHeading
              heading="Ce que ce dossier ne peut pas dire"
              id={`${dossier.slug}-limites`}
              stepLabel="Les limites"
            />
            <div className="afh-dossier-prose">
              {dossier.gaps.map((gap) => (
                <p key={gap.fieldPath}>{gap.reason}</p>
              ))}
            </div>
          </section>
        ) : null}

        <section aria-labelledby={`${dossier.slug}-sources`}>
          <ChapterHeading
            heading={`${dossier.sources.length} sources, chacune à son niveau`}
            id={`${dossier.slug}-sources`}
            stepLabel="Les sources"
          />
          <ul className="afh-dossier-sources">
            {dossier.sources.map((source) => (
              <li className="afh-dossier-source" key={source.sourceKey}>
                <p className="afh-dossier-source-title">
                  {source.url ? (
                    <a href={source.url} rel="noreferrer" target="_blank">
                      {source.title}
                    </a>
                  ) : (
                    source.title
                  )}
                </p>
                <p className="afh-dossier-source-notes">
                  {[
                    SOURCE_TIER_LABELS[language][source.tier],
                    source.publicationYear
                      ? String(source.publicationYear)
                      : null,
                    source.notes ?? null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </PageLayout>
  );
}
