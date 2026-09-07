/**
 * What marks a sentence as written for the curator rather than for the reader.
 *
 * Three kinds, and the third is the one worth naming. A repository path or a
 * raw `PPL_`/`FLG_`/`PAT_` identifier is obvious once seen. The pipeline's own
 * vocabulary is not: "la file d'attente des candidats", "le protocole de
 * recherche par fiche", "la revue claim-level reste requise" all read as
 * ordinary French, so they survived every review — while telling the visitor
 * about a work queue, a research backlog and an unresolved tier that describe
 * how the atlas is made, not what it knows.
 *
 * The reader is owed the silence itself ("l'atlas ne documente pas encore ce
 * point"), never the reason the workshop has not filled it yet.
 *
 * This lives under `src/` rather than beside the gate that enforces it because
 * it now has two callers with opposite timing. `scripts/ci/checkEditorialRules`
 * reads it at build time to refuse a fiche; `lib/seo/ficheMetadata` reads it at
 * request time to refuse a title. A second copy of the vocabulary would let the
 * two disagree about what the reader may see, which is the one thing a single
 * exported constant exists to prevent.
 */
export interface RegisterPattern {
  label: string;
  pattern: RegExp;
}

/** The leaks that are the same in any language: paths, filenames, identifiers. */
// @req REQ-143
export const LANGUAGE_NEUTRAL_REGISTER_PATTERNS: ReadonlyArray<RegisterPattern> =
  [
    {
      label: "repository path",
      pattern: /\b(?:dataset|docs|scripts|src|public)\/[\w./-]+/,
    },
    { label: "file name", pattern: /\b[\w-]+\.json\b/ },
    {
      label: "JSON field path",
      pattern:
        /\b(?:content|_meta)\.\w+|\bfieldPath\b|\bsourceRefs\b|\bsourceKey\b|\bverificationLead\b|\btargetPatronymeId\b|\bclassificationStatus\b/,
    },
    {
      // The wildcard form matters as much as a full id: 468 alliance gap
      // reasons told the reader no pact was found "avec une autre fiche
      // PAT_* existante", and `PAT_*` is not a word any reader has.
      label: "raw corpus identifier",
      pattern: /\b(?:PPL|FLG|PAT)_(?:[A-Z0-9_]+|\*)/,
    },
    { label: "internal corpus label", pattern: /Corpus AFRIK\s*—/i },
  ];

// @req REQ-143
export const INTERNAL_REGISTER_PATTERNS: ReadonlyArray<RegisterPattern> = [
  ...LANGUAGE_NEUTRAL_REGISTER_PATTERNS,
  {
    label: "curation vocabulary",
    pattern:
      /file d'attente|passe de recherche|passe anthroponymique|protocole de recherche|claim-level|tier hérité|hors corpus|plan de couverture|vague \d+ du plan/i,
  },
];

/**
 * The same leak, translated. A machine translation of "attend le protocole de
 * recherche par fiche" is "awaits the per-record research protocol", which
 * reads as ordinary English and passes the French list unseen.
 */
// @req REQ-143
export const INTERNAL_REGISTER_PATTERNS_EN: ReadonlyArray<RegisterPattern> = [
  ...LANGUAGE_NEUTRAL_REGISTER_PATTERNS,
  {
    label: "curation vocabulary",
    pattern:
      /(?:candidate|work|research) queue|research (?:pass|protocol)|anthroponym pass|claim-level|inherited tier|out(?:side)? (?:of )?(?:the )?corpus|coverage plan|wave \d+ of the plan/i,
  },
];

/**
 * Whether a string may be shown to a reader as-is.
 *
 * Both language lists are checked, never the one matching the current locale:
 * a French fiche can carry an English source note, and the surface that renders
 * it does not know which language wrote it.
 */
// @req REQ-091
export function violatesReaderRegister(text: string): boolean {
  return [...INTERNAL_REGISTER_PATTERNS, ...INTERNAL_REGISTER_PATTERNS_EN].some(
    ({ pattern }) => pattern.test(text)
  );
}
