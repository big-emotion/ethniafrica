import Link from "next/link";
import type { ReactNode } from "react";

import { FicheTile, FicheTiles } from "@/components/fiche/FicheTile";
import { FieldProvenanceMarker } from "@/components/fiche/FieldProvenanceMarker";
import type { ParagraphNoteData } from "@/components/people/peopleFicheNotes";
import { ProseWithChip } from "@/components/people/ProseWithChip";
import type { CultureTile } from "@/lib/fiche/culture";
import { getPeopleRoute } from "@/lib/routing";
import type { Language } from "@/types/shared";

export interface FicheCultureChapterProps {
  tiles: readonly CultureTile[];
  /** One note call per sourced field, keyed by the field a passage names. */
  notes?: Partial<Record<string, ParagraphNoteData>>;
  /**
   * Detail only one record carries, placed inside the tile it belongs to —
   * a people's sourced neighbours under "Relations".
   */
  extras?: Partial<Record<string, ReactNode>>;
  language: Language;
}

function detailOf(tile: CultureTile): string {
  return [
    ...tile.passages.map((passage) => passage.text),
    ...(tile.pills ?? []).map((pill) => pill.label),
    ...(tile.extraText ?? []),
  ].join(" ");
}

/**
 * The culture chapter both records share: the same tiles on one grid, a
 * preview of two lines, the whole field behind "+ en savoir plus".
 *
 * The preview is plain text, so an opened tile restates its fields in full
 * with their note calls, and the preview steps aside. A chapter the record
 * leaves silent says so rather than disappearing (atlas charter §4).
 */
// @req REQ-092 REQ-097 REQ-153
export function FicheCultureChapter({
  tiles,
  notes,
  extras,
  language,
}: FicheCultureChapterProps) {
  if (tiles.length === 0) {
    return <FieldProvenanceMarker state="missing" language={language} />;
  }

  return (
    <FicheTiles>
      {tiles.map((tile) => (
        <FicheTile
          key={tile.key}
          language={language}
          title={tile.label}
          value={tile.value}
          closedFact={tile.preview}
          detailText={detailOf(tile)}
          bodyRestatesPreview={tile.passages.length > 0}
          wide={Boolean(tile.pills?.length)}
        >
          {tile.passages.map((passage, index) => (
            <div
              key={`${passage.field ?? tile.key}-${index}`}
              className="afh-tile-passage"
            >
              {passage.label && tile.passages.length > 1 ? (
                <p className="afh-tile-term">{passage.label}</p>
              ) : null}
              <ProseWithChip
                language={language}
                text={passage.text}
                note={passage.field ? notes?.[passage.field] : undefined}
                className="afh-tile-prose"
              />
            </div>
          ))}
          {tile.pills?.length ? (
            <ul className="afh-pills">
              {tile.pills.map((pill) => (
                <li key={pill.label}>
                  {pill.peopleId ? (
                    <Link href={getPeopleRoute(language, pill.peopleId)}>
                      {pill.label}
                    </Link>
                  ) : (
                    pill.label
                  )}
                </li>
              ))}
            </ul>
          ) : null}
          {extras?.[tile.key]}
        </FicheTile>
      ))}
    </FicheTiles>
  );
}
