import type { TranslationKind } from "@/lib/i18n/translationSidecarRules";
import { DossierCitations } from "./DossierCitations";
import { DossierChapterBlock } from "@/components/dossiers/DossierChapterBlock";
import { PageLayout } from "@/components/layout/PageLayout";
import { ChapterHeading } from "@/components/pages/ChapterHeading";
import type { Dossier } from "@/lib/afrik/parsers/dossierTypes";
import { SOURCE_TIER_LABELS } from "@/lib/glossaire/vocabularies";
import type { Language } from "@/types/shared";

/** Shared reader: sourced chapters, optional figures and comparative readings. */
export interface DossierPageProps {
  dossier: Dossier;
  language: Language;
  translationState?: TranslationKind | "missing";
}

// @req REQ-113
export function DossierPage({
  dossier,
  language,
  translationState,
}: DossierPageProps) {
  const contentLanguage = translationState === "missing" ? "fr" : language;
  const en = contentLanguage === "en";
  return (
    <PageLayout
      language={language}
      heroHead={
        <div lang={contentLanguage}>
          <h1 className="afh-hero-title">{dossier.title}</h1>
          <p className="afh-hero-subtitle">{dossier.standfirst}</p>
        </div>
      }
      subtitle={dossier.standfirst}
      title={dossier.title}
      trailLabel={dossier.title}
    >
      <div className="afh-accent-teal afh-dossier" lang={contentLanguage}>
        {translationState === "machine" ? (
          <p className="afh-dossier-translation" lang="en">
            Machine translation from French
          </p>
        ) : null}
        {translationState === "missing" ? (
          <p className="afh-dossier-translation" lang="en">
            English translation is not available. The original French dossier
            follows.
          </p>
        ) : null}
        {dossier.thesis.figures.length > 0 ? (
          <section aria-labelledby={`${dossier.slug}-these`}>
            <ChapterHeading
              heading={dossier.thesis.heading}
              id={`${dossier.slug}-these`}
              stepLabel={dossier.thesis.stepLabel}
            />
            <ul className="afh-dossier-thesis">
              {dossier.thesis.figures.map((figure) => (
                <li
                  className="afh-dossier-thesis-figure"
                  key={figure.figureKey}
                >
                  {/* A key figure set at h1 inside a <p> — typography charter
                    §3, case 1. It is a number, not a section, and marking it
                    up as a heading would put three of them above every
                    chapter title on the page. */}
                  <p className="afh-dossier-thesis-value">{figure.value}</p>
                  <p className="afh-dossier-thesis-claim">{figure.claim}</p>
                  <p className="afh-dossier-thesis-provenance">
                    {`${figure.provenance} · ${figure.year}`}
                    <DossierCitations
                      refs={figure.sourceRefs}
                      sources={dossier.sources}
                      prefix={dossier.slug}
                    />
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section aria-labelledby={`${dossier.slug}-dossier`}>
          <ChapterHeading
            heading={dossier.question}
            id={`${dossier.slug}-dossier`}
            stepLabel={en ? "The dossier" : "Le dossier"}
          />
          <div className="afh-dossier-chapters">
            {dossier.chapters.map((chapter, index) => (
              <DossierChapterBlock
                chapter={chapter}
                language={contentLanguage}
                sources={dossier.sources}
                sourcePrefix={dossier.slug}
                index={index}
                key={chapter.chapterKey}
              />
            ))}
          </div>
        </section>

        {dossier.gaps.length > 0 ? (
          <section aria-labelledby={`${dossier.slug}-limites`}>
            <ChapterHeading
              heading={
                en
                  ? "What this dossier cannot establish"
                  : "Ce que ce dossier ne peut pas dire"
              }
              id={`${dossier.slug}-limites`}
              stepLabel={en ? "The limits" : "Les limites"}
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
            heading={
              en
                ? `${dossier.sources.length} sources, each with its own standing`
                : `${dossier.sources.length} sources, chacune à son niveau`
            }
            id={`${dossier.slug}-sources`}
            stepLabel={en ? "Sources" : "Les sources"}
          />
          <ul className="afh-dossier-sources">
            {dossier.sources.map((source, index) => (
              <li
                className="afh-dossier-source"
                key={source.sourceKey}
                id={`${dossier.slug}-source-${source.sourceKey}`}
              >
                <p className="afh-dossier-source-title">
                  {source.url ? (
                    <a href={source.url} rel="noreferrer" target="_blank">
                      {`[${index + 1}] ${source.title}`}
                    </a>
                  ) : (
                    `[${index + 1}] ${source.title}`
                  )}
                </p>
                <p className="afh-dossier-source-notes">
                  {[
                    SOURCE_TIER_LABELS[contentLanguage][source.tier],
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
