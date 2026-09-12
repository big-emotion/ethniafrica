/**
 * A tile as the shared chapters describe it, before it is drawn.
 *
 * The culture and the language chapters of both records produce these, and
 * `FicheTileChapter` draws them — one renderer, so the two chapters cannot
 * drift into two dresses the way the four components they replace did.
 */

interface FicheTilePassage {
  /** The corpus field the text comes from, so a note call can find it. */
  field?: string;
  /** A term above the passage when a tile gathers several fields. */
  label?: string;
  text: string;
}

interface FicheTilePill {
  label: string;
  /** Where the pill leads, when the atlas holds a record for it. */
  href?: string;
  /** A code set beside the label, such as an ISO 639-3 language code. */
  code?: string;
}

export interface FicheTileData {
  key: string;
  label: string;
  value?: string;
  /** Where the value leads — a language family, from a people. */
  valueHref?: string;
  preview: string;
  passages: FicheTilePassage[];
  pills?: FicheTilePill[];
  /** Words the record adds inside the tile, so the tile knows it has a body. */
  extraText?: string[];
  wide?: boolean;
}
