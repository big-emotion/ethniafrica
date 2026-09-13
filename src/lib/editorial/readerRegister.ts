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
    // A ticket number tells the reader which work queue produced a sentence.
    { label: "ticket identifier", pattern: /\bETNI-\d+\b/ },
  ];

// @req REQ-143
export const INTERNAL_REGISTER_PATTERNS: ReadonlyArray<RegisterPattern> = [
  ...LANGUAGE_NEUTRAL_REGISTER_PATTERNS,
  {
    label: "curation vocabulary",
    pattern:
      /file d'attente|passe de recherche|passe anthroponymique|protocole de recherche|claim-level|tier hérité|hors corpus|plan de couverture|vague \d+ du plan/i,
  },
  {
    label: "pipeline source note",
    pattern:
      /Tier (?:resolved|inferred|resolu)\b|No URL and no recognisable citation shape|No domain ruling covers|the tier awaits editorial review|Resolved from the (?:prior|URL-less)\b/i,
  },
  {
    // The English tier-provenance class, written in French by hand — often
    // unaccented. Each alternative names the tier decision itself, so a note
    // that says what a source is ("vérifié au catalogue de la BnF",
    // "encyclopédie adossée à…") stays readable.
    label: "tier provenance",
    pattern:
      /\btier (?:inf[ée]r[ée]|r[ée]solu|fond[ée])|catalogue (?:de|des) (?:domaines|sources) (?:officiels|autoris[ée]es)|r[èe]gles? de domaine|doctrine des sources/i,
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
  {
    // The tiering codemod explained its own decision in every note it wrote:
    // which catalogue entry or domain ruling set the tier, or that nobody had
    // ruled yet. The tier badge already tells the reader how far to trust a
    // source; how the workshop reached it is the workshop's business. Curators
    // who followed the codemod wrote the same reasoning by hand, hence the
    // `needs_review` marker and "tiered referenced".
    label: "tier provenance",
    pattern:
      /domain ruling|awaits editorial review|citation shape|authori[sz]ed source catalogue|needs_review|tiered (?:as )?(?:official|referenced|unverified)|tier table|\btier (?:resolved|inferred)\b/i,
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
