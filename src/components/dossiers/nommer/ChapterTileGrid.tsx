import { ChapterTile } from "@/components/dossiers/nommer/ChapterTile";
import type { DossierChapter } from "@/lib/dossiers/nommer/types";
import { cn } from "@/lib/utils";
import type { Language } from "@/types/shared";

interface ChapterTileGridProps {
  language: Language;
  chapters: DossierChapter[];
  className?: string;
}

/**
 * The chapters, as a grid of tiles that navigate.
 *
 * They navigate rather than deploy in place, and the rule that decides it is
 * worth stating once: **a tile deploys only when what it would deploy is not
 * a page.** `QuizScopeDeck` says the same of itself — "a half-made choice is
 * not a page" — and the atlas charter §3 puts the same test on any disclosure:
 * does it add a choice? A panel offering "lire le chapitre" adds none, and a
 * panel offering section anchors would duplicate the chapter bar that is one
 * click away. Either way it would be the stacked navigation level this dossier
 * was asked not to have, drawn sideways.
 *
 * What that buys: five real anchors, no client component, no `aria-expanded`,
 * no focus return, no Escape handler, and no JavaScript at all on the pillar.
 *
 * The breakpoints are `sm`/`lg`, not `md`/`xl`. `tailwind.config.ts` leaves
 * `theme.screens` at Tailwind's defaults (only `theme.container.screens` is
 * overridden), so `md` is 768 and `xl` is 1280 — a grid keyed on those would
 * still be one column at the 720 px tablet width this project reviews at.
 * `sm`/`lg` gives 1 · 2 · 2 · 3 across 430, 720, 800 and 1024.
 *
 * `<ol>` because the chapters are a sequence: the order is the argument, and
 * a screen reader is told how many there are before the first one.
 */
// @req REQ-113
export const ChapterTileGrid = ({
  language,
  chapters,
  className,
}: ChapterTileGridProps) => (
  <ol
    className={cn(
      "grid grid-cols-1 gap-afh-lg p-0 sm:grid-cols-2 lg:grid-cols-3",
      className
    )}
  >
    {chapters.map((chapter, index) => (
      <ChapterTile
        key={chapter.key}
        language={language}
        chapter={chapter}
        index={index}
      />
    ))}
  </ol>
);
