import type { CSSProperties } from "react";

import { QuizTrackCard } from "@/components/quiz/QuizTrackCard";
import type { DossierChapter } from "@/lib/dossiers/nommer/types";
import { getNommerChapterRoute } from "@/lib/routing";
import type { Language } from "@/types/shared";

interface ChapterTileProps {
  language: Language;
  chapter: DossierChapter;
  /** Position in the grid. Drives the arrival cascade, nothing else. */
  index: number;
}

/**
 * One chapter, as a tile whose whole surface is the link.
 *
 * It wraps `QuizTrackCard` rather than drawing a second card. The charter
 * gives module tiles one radius and one hover dress, and a surface that
 * invents its own is a fourth shape a reader has to learn — so the only thing
 * added here is the third level, through the `children` slot the card already
 * exposes.
 *
 * Three levels, and there is no fourth (typography charter §4): the title, the
 * question, and the measure. The measure is a **line**, not a big numeral,
 * because one of the five reads « bantou », 1862 — a word and a date. A
 * template built around a hero-sized figure would have made that tile absurd
 * and broken the rhythm of the row, so the emphasis is carried by weight and
 * `--accent-ink` inside the caption rather than by a size of its own.
 *
 * `mt-auto` is structural rather than cosmetic. The card is a flex column, so
 * pushing the measure to the floor lands all five on one baseline: the reader
 * compares five measures instead of reading five cards.
 *
 * `text-left` is not decoration either. `mobile-text.css` centres the body
 * below 768 px and only rules `p`, `blockquote`, `dt` and `dd` back to the
 * left — and the card writes its title and question in `<span>`s. Without this
 * the title would sit centred above a left-aligned measure, inside one card:
 * the "one declaration, three alignments" defect the brand charter §8.1
 * describes. A block that declares its alignment keeps it.
 */
// @req REQ-113
export const ChapterTile = ({ language, chapter, index }: ChapterTileProps) => (
  <li
    className="nommer-tile-slot list-none"
    style={{ "--nommer-index": index } as CSSProperties}
  >
    <QuizTrackCard
      href={getNommerChapterRoute(language, chapter.key)}
      labelFr={chapter.title}
      hintFr={chapter.question}
      testId={`nommer-chapter-${chapter.key}`}
      className="nommer-tile h-full text-left"
    >
      <p className="mt-auto pt-afh-md text-afh-caption text-afh-text-soft">
        <span className="font-semibold text-[color:var(--accent-ink)]">
          {chapter.ordinal}
        </span>
        {" · "}
        <span className="font-semibold text-[color:var(--accent-ink)]">
          {chapter.measure.value}
        </span>{" "}
        {chapter.measure.unit}
      </p>
    </QuizTrackCard>
  </li>
);
