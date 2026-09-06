import { NOMMER_CHAPTERS } from "@/lib/dossiers/nommer/chapters";
import { NOMMER_CHAPTERS_EN } from "@/lib/dossiers/nommer/chapters/index.en";
import type { DossierChapter } from "@/lib/dossiers/nommer/types";
import type { Language } from "@/types/shared";

// @req REQ-145
export function localizeNommerChapter(
  chapter: DossierChapter,
  language: Language
): DossierChapter {
  if (language === "fr") return chapter;

  const translation = NOMMER_CHAPTERS_EN[chapter.key];
  return {
    ...chapter,
    title: translation.title,
    question: translation.question,
    standfirst: { ...chapter.standfirst, text: translation.standfirst },
    measure: { ...chapter.measure, ...translation.measure },
    sections: chapter.sections.map((section) => {
      const sectionTranslation = translation.sections[section.id];
      return {
        ...section,
        stepLabel: sectionTranslation.stepLabel,
        heading: sectionTranslation.heading,
        blocks: section.blocks.map((block) => ({
          ...block,
          text: sectionTranslation.blocks[block.id],
        })),
        table:
          section.table && sectionTranslation.table
            ? {
                ...section.table,
                caption: sectionTranslation.table.caption,
                columns: sectionTranslation.table.columns,
                rows: section.table.rows.map((row, index) => ({
                  ...row,
                  cells: sectionTranslation.table!.rows[index],
                })),
              }
            : section.table,
        pairs:
          section.pairs && sectionTranslation.pairs
            ? section.pairs.map((pair, index) => ({
                ...pair,
                ...sectionTranslation.pairs![index],
              }))
            : section.pairs,
      };
    }),
    entities: chapter.entities.map((entity) => ({
      ...entity,
      label: translation.entities[entity.id],
    })),
  };
}

// @req REQ-145
export const getLocalizedNommerChapters = (
  language: Language
): DossierChapter[] =>
  NOMMER_CHAPTERS.map((chapter) => localizeNommerChapter(chapter, language));
