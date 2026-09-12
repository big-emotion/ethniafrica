import Link from "next/link";
import type { ReactNode } from "react";

import { FicheTile, FicheTiles } from "@/components/fiche/FicheTile";
import { FieldProvenanceMarker } from "@/components/fiche/FieldProvenanceMarker";
import type { ParagraphNoteData } from "@/components/people/peopleFicheNotes";
import { ProseWithChip } from "@/components/people/ProseWithChip";
import type { FicheTileData } from "@/lib/fiche/tileData";
import type { Language } from "@/types/shared";

export interface FicheTileChapterProps {
  tiles: readonly FicheTileData[];
  /** One note call per sourced field, keyed by the field a passage names. */
  notes?: Partial<Record<string, ParagraphNoteData>>;
  /**
   * Detail only one record carries, placed inside the tile it belongs to —
   * a people's sourced neighbours under "Relations".
   */
  extras?: Partial<Record<string, ReactNode>>;
  language: Language;
}

function detailOf(tile: FicheTileData): string {
  return [
    ...tile.passages.map((passage) => passage.text),
    ...(tile.pills ?? []).flatMap((pill) => [pill.label, pill.code ?? ""]),
    ...(tile.extraText ?? []),
  ].join(" ");
}

/**
 * The tiles of a shared chapter — culture, languages — on one grid: a preview
 * of two lines, the whole field behind "+ en savoir plus".
 *
 * The preview is plain text, so an opened tile restates its fields in full
 * with their note calls, and the preview steps aside. A chapter the record
 * leaves silent says so rather than disappearing (atlas charter §4).
 */
// @req REQ-091 REQ-097 REQ-153
export function FicheTileChapter({
  tiles,
  notes,
  extras,
  language,
}: FicheTileChapterProps) {
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
          value={
            tile.value && tile.valueHref ? (
              <Link href={tile.valueHref}>{tile.value}</Link>
            ) : (
              tile.value
            )
          }
          closedFact={tile.preview}
          detailText={detailOf(tile)}
          bodyRestatesPreview={tile.passages.length > 0}
          wide={Boolean(tile.wide)}
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
                <li key={`${pill.label}-${pill.code ?? ""}`}>
                  {pill.href ? (
                    <Link href={pill.href}>{pill.label}</Link>
                  ) : (
                    <span>{pill.label}</span>
                  )}
                  {pill.code ? (
                    <span className="afh-pill-code">{pill.code}</span>
                  ) : null}
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
