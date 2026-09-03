import type { NommerChapterKey } from "@/lib/routing";

import type { SourceKey } from "@/lib/dossiers/nommer/types";

/**
 * The three questions a reader arrives with, and the only reason the glossary
 * is divided at all: where does a name come from, what is being named, and
 * what does naming do. Alphabetical order inside each, so a term is found the
 * way a term is looked up.
 */
export type GlossaryFamily = "origine" | "objet" | "effet";

/**
 * Whether the corpus holds an instance of the thing the term names.
 *
 * A glossary that only defined what the atlas already carries would quietly
 * shrink the vocabulary to fit the collection. A glossary that defined
 * everything without saying which of it is instantiated would let a reader
 * assume the corpus is fuller than it is. So an entry says which it is, and
 * an entry with nothing behind it has to say why (atlas charter §4).
 */
export type CorpusPresence = "instantiated" | "defined_only";

export interface GlossaryEntry {
  /** Public anchor, kebab-case: chapters and fiches link to `#terme-<id>`. */
  id: string;
  /** The French term, as the atlas writes it. */
  fr: string;
  /**
   * The English term.
   *
   * Carried from the first line even though only the French column renders,
   * because REQ-144 asks for one *bilingual* glossary rather than a French
   * one with a translation bolted on later. It is also where the requirement's
   * own rule is enforceable: `peuple` renders as `people`, never as `tribe`.
   */
  en: string;
  family: GlossaryFamily;
  /** One or two lines. Longer than that is a chapter, not a notice. */
  definition: string;
  /** What the corpus shows, in the reader's terms. */
  corpusExample?: string;
  corpusPresence: CorpusPresence;
  /** Required when nothing instantiates the term. */
  absenceReason?: string;
  /** Ids of related entries, rendered as inline links. */
  seeAlso?: string[];
  /** The chapter where the term is put to work. */
  chapterRef?: NommerChapterKey;
  sourceRefs?: SourceKey[];
}
