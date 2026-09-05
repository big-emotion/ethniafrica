/**
 * The shapes the « Qui a donné ce nom ? » dossier is written in.
 *
 * The dossier's whole argument is "here is how many, and here is who says
 * so". That makes two things load-bearing that prose alone cannot carry, and
 * both are types here rather than conventions:
 *
 *   - a figure declares **where it comes from** (`CorpusFigure`), because the
 *     dossier mixes numbers read from the database at render, numbers counted
 *     off the git corpus, numbers a human read out of free prose, and numbers
 *     the corpus cannot produce at all. Printing all four the same way is the
 *     defect this dossier exists to describe;
 *   - a paragraph declares **what backs it** (`ProseBlock`), because a test
 *     can then refuse to publish a dated or numbered claim that cites nothing.
 *
 * Sources are entries in one bibliography addressed by key, not objects
 * inlined at each use. `didYouKnowFacts.ts` inlines them, which is right for
 * 28 independent cards; across five chapters and thirty glossary notices the
 * same work would be retyped six times and drift. The corpus already settled
 * this the other way — a patronyme fiche carries `sources[{ sourceKey, … }]`
 * and refers to them by `sourceRefs` — so this follows the corpus.
 */

import type { TranslationLocale } from "@/lib/i18n/translationLocale";
import type { TranslationKind } from "@/lib/i18n/translationSidecarRules";
import type { NommerChapterKey } from "@/lib/routing";
import type { SourceTier, StructuredSourceKind } from "@/types/sources";

/** A key into `NOMMER_BIBLIOGRAPHY`, e.g. `"bleek-1862"`. */
export type SourceKey = string;

/** A key into `NOMMER_FIGURES`, e.g. `"corpus-exonyms"`. */
export type FigureKey = string;

/**
 * One work the dossier cites.
 *
 * The authority field is named `standing`, not `tier`, and typed to include
 * `needs_review`. That is exactly the signature of `sourceStandingLabel`,
 * which is the only thing allowed to turn it into words: `strictNullChecks`
 * is off in this repo, so indexing `SOURCE_TIER_LABELS` with a value that
 * turns out to be `needs_review` yields an empty string — a source rendered
 * with no visible provenance, the one outcome the tier policy forbids.
 */
export interface DossierSource {
  sourceKey: SourceKey;
  title: string;
  authors: string[];
  publicationYear: number | null;
  publisher: string | null;
  url: string | null;
  standing: SourceTier | "needs_review";
  sourceKind: StructuredSourceKind;
  /** What this citation actually supports — and what it leaves open. */
  notes: string;
  /**
   * The Wikipedia language editions the claim was first met in, if any.
   *
   * Wikipedia is not a source: a primary source found through it is cited at
   * its own tier, by its own URL, with the editions crossed recorded here so
   * the chain stays auditable. Emptying this array is what "remonter à la
   * source primaire" means, and `nommerSources.test.ts` reads it — a chapter
   * cannot ship while any of its sources still carries one.
   */
  discoveredVia: string[];
}

/**
 * A number the dossier prints, and where it came from.
 *
 * Three branches, because the dossier genuinely has three kinds of number and
 * the atlas charter §4 requires the interface to say which is which.
 *
 * There is deliberately no "read from the database at render" branch. The
 * database and the git corpus disagree — `name_records` deduplicates spellings,
 * so it answers 3,8 exonyms per endonym where the fiches answer 4 — and a
 * dossier that quoted whichever number the page happened to reach would be
 * unciteable. The corpus is the editorial source of truth, so the dossier
 * counts it, and the suite replays the count.
 */
export type CorpusFigure =
  | {
      /** Reproducible from `dataset/source/afrik/` by the stated command. */
      kind: "counted";
      figureKey: FigureKey;
      label: string;
      value: number;
      method: string;
      /** ISO date the count was taken. */
      countedOn: string;
    }
  | {
      /**
       * A human reading of free prose — not a measurement of the corpus.
       * The caveat is published with the figure, verbatim.
       */
      kind: "read";
      figureKey: FigureKey;
      label: string;
      value: number;
      method: string;
      readOn: string;
      caveat: string;
    }
  | {
      /** The corpus cannot produce this figure, and the dossier says so. */
      kind: "missing";
      figureKey: FigureKey;
      label: string;
      reason: string;
    };

/**
 * One paragraph, with what backs it.
 *
 * `sourceRefs` covers dates and named claims; `figureRefs` covers numbers
 * that come from the corpus rather than from a cited work. A block carrying
 * neither may hold no digit and no century — that is the rule the suite
 * enforces.
 */
export interface ProseBlock {
  /**
   * Kebab-case, unique within the chapter. A translation keys on it: keyed
   * by position, a sidecar would silently attach itself to the wrong
   * paragraph the day an editor inserted one above it.
   */
  id: string;
  text: string;
  sourceRefs: SourceKey[];
  figureRefs: FigureKey[];
}

/** A row of a chapter table: cells plus the refs that back the row. */
export interface ChapterTableRow {
  cells: string[];
  sourceRefs: SourceKey[];
  figureRefs: FigureKey[];
}

/** A table a chapter renders, in its own scrollable labelled region. */
export interface ChapterTable {
  caption: string;
  columns: string[];
  rows: ChapterTableRow[];
}

/**
 * An autonym/exonym pair, as the corpus writes it.
 *
 * `imposedBy` is the vector, not a verdict: the corpus records exonyms that
 * no source calls pejorative, and the chapter that flattens those into the
 * hostile ones loses the right to be believed about the hostile ones.
 */
export interface NamePair {
  endonym: string;
  endonymGloss: string | null;
  exonym: string;
  imposedBy: string;
  /** True only where a source documents the term itself as pejorative. */
  pejorative: boolean;
  sourceRefs: SourceKey[];
}

/**
 * One section of a chapter. `id` is a public anchor and doubles as the
 * `FicheChapterBar` target, so it is kebab-case and stable.
 */
export interface ChapterSection {
  id: string;
  /** `ChapterHeading`'s contract: "01 · Le peuple". */
  stepLabel: string;
  heading: string;
  blocks: ProseBlock[];
  table?: ChapterTable;
  pairs?: NamePair[];
}

/** An entity the chapter opens onto, so it is an exit into the atlas. */
export interface ChapterEntity {
  kind: "people" | "country" | "family";
  id: string;
  label: string;
}

/**
 * The tile's third level, and the only number a reader meets before they have
 * read anything.
 *
 * It carries its own refs rather than borrowing the chapter's: a figure shown
 * on a navigation tile is still an assertion, and the one most likely to be
 * screenshotted out of context. Split into `value` and `unit` so a count
 * (3 207 · exonymes recensés) and a word-and-date (« bantou » · 1862, première
 * attestation) share one shape — a template built around a big numeral would
 * have made the fourth tile absurd.
 */
export interface ChapterMeasure {
  value: string;
  unit: string;
  sourceRefs: SourceKey[];
  figureRefs: FigureKey[];
}

export interface DossierChapter {
  key: NommerChapterKey;
  /** "01" … "05". Rendered in the tile's metadata line. */
  ordinal: string;
  title: string;
  /**
   * The question the tile asks, in one or two lines. Deliberately free of
   * digits and dates: a tile asks, the chapter answers, and a number on the
   * support line would be a claim with nowhere to put its source.
   */
  question: string;
  /** The chapter's claim, in one sentence. */
  standfirst: ProseBlock;
  measure: ChapterMeasure;
  sections: ChapterSection[];
  entities: ChapterEntity[];
}

/** The translatable leaves of a chapter table: caption, columns, then one cell list per French row, in row order. */
export interface ChapterTableTranslation {
  caption: string;
  columns: string[];
  rows: string[][];
}

/**
 * What translates on a name pair — the gloss and the vector. `endonym` and
 * `exonym` are the words the pair exists to show and stay on the French
 * record (REQ-143: an autonym translated is a renaming).
 */
export interface NamePairTranslation {
  endonymGloss: string | null;
  imposedBy: string;
}

export interface ChapterSectionTranslation {
  stepLabel: string;
  heading: string;
  /** Block text by block id. */
  blocks: Readonly<Record<string, string>>;
  table?: ChapterTableTranslation;
  /** Matched by position under the section, like table rows. */
  pairs?: NamePairTranslation[];
}

/**
 * A chapter's translatable leaves, in the chapter's own nesting, keyed by
 * the ids the French record declares — section `id`, block `id`, entity
 * `id`. Table rows and name pairs carry no id of their own and are matched
 * by position; the parity suite holds the two arrays to the same length.
 *
 * Only what translates is carried. Source and figure references, people
 * names, autonyms and exonyms stay on the French record, so a translation
 * cannot cite a work the French does not or rename what the dossier is
 * about. `provenance` is one value for the whole chapter (DEC-048): a
 * sidecar is produced in one pass and reviewed in one pass, and a paragraph-
 * level mix of machine and human output would leave the reader nothing to
 * hold a marker against.
 */
export interface DossierChapterTranslation {
  key: NommerChapterKey;
  locale: TranslationLocale;
  provenance: TranslationKind;
  title: string;
  question: string;
  standfirst: string;
  measure: { value: string; unit: string };
  sections: Readonly<Record<string, ChapterSectionTranslation>>;
  /**
   * Entity labels by entity id. A people keeps the label the French shows,
   * which is already the name (REQ-143). A country takes its English name,
   * and so does a family: « Famille bantoue » is a French phrase around the
   * corpus's own `nameEn`, not a name the glossary would hold verbatim.
   */
  entities: Readonly<Record<string, string>>;
}
