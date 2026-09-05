import { ChapterTile } from "@/components/dossiers/nommer/ChapterTile";
import { NamePairGrid } from "@/components/dossiers/nommer/NamePairGrid";
import { SourcedTable } from "@/components/dossiers/nommer/SourcedTable";
import { FicheChapterBar } from "@/components/fiche/FicheChapterBar";
import { FicheSection } from "@/components/fiche/FicheSection";
import { PageLayout } from "@/components/layout/PageLayout";
import { ActionLink } from "@/components/ui/ActionLink";
import { NOMMER_CHAPTERS } from "@/lib/dossiers/nommer/chapters";
import type { DossierChapter } from "@/lib/dossiers/nommer/types";
import { getLocalizedRoute } from "@/lib/routing";
import type { Language } from "@/types/shared";

interface NommerChapterPageProps {
  chapter: DossierChapter;
  language: Language;
}

/**
 * One chapter of « Qui a donné ce nom ? », on the parchment.
 *
 * The composition rule is the one the brief asked for in as many words:
 * **never two consecutive sections in the same register.** Prose, then a
 * table, then name pairs, then prose again — the alternation is declared in
 * the content module, and this component only renders whichever registers a
 * section carries. A chapter that turned into six paragraphs would fail the
 * brief without failing a test, so the alternation is an editorial rule the
 * writing holds, not something the markup can enforce.
 *
 * `FicheChapterBar` is mounted unchanged. It falls back to `document.body`,
 * collects `[data-fiche-section]` nodes carrying an `id`, and withdraws below
 * two of them — which is exactly the service it renders on a fiche. Two things
 * it is deliberately *not* given: `data-fiche-sequence`, which would assert
 * this dossier is a fiche, and an `entityId`, which would offer a report
 * control on a page that is not a corpus entity.
 *
 * The reader leaves through the four other chapters rather than back through
 * the pillar. That is what a grid of tiles at the foot buys, and it is why the
 * tiles navigate rather than deploy: the same component serves both surfaces.
 */
// @req REQ-113
export const NommerChapterPage = ({
  chapter,
  language,
}: NommerChapterPageProps) => {
  const others = NOMMER_CHAPTERS.filter((entry) => entry.key !== chapter.key);
  const pillarHref = getLocalizedRoute(language, "nommer");

  return (
    <PageLayout
      language={language}
      title={chapter.title}
      subtitle={chapter.standfirst.text}
    >
      <div className="afh-accent-teal flex flex-col gap-afh-6xl">
        <FicheChapterBar />

        <article className="afh-parchment">
          {chapter.sections.map((section) => (
            <FicheSection
              key={section.id}
              id={section.id}
              title={section.heading}
              testId={`nommer-section-${section.id}`}
            >
              {section.blocks.map((block) => (
                <p key={block.text.slice(0, 48)}>{block.text}</p>
              ))}
              {section.table ? <SourcedTable table={section.table} /> : null}
              {section.pairs ? <NamePairGrid pairs={section.pairs} /> : null}
            </FicheSection>
          ))}
        </article>

        <nav
          aria-label="Les autres chapitres"
          className="flex flex-col gap-afh-lg"
        >
          <p className="text-afh-eyebrow uppercase tracking-wide text-afh-text-soft">
            Les autres chapitres
          </p>
          <ol className="grid grid-cols-1 gap-afh-lg p-0 sm:grid-cols-2 lg:grid-cols-4">
            {others.map((entry, index) => (
              <ChapterTile
                key={entry.key}
                language={language}
                chapter={entry}
                index={index}
              />
            ))}
          </ol>
          <ActionLink href={pillarHref}>Revenir au dossier</ActionLink>
        </nav>
      </div>
    </PageLayout>
  );
};
