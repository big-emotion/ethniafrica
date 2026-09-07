import type {
  FieldNote,
  NoteSource,
} from "@/lib/supabase/queries/afrik/module-zero-batch";
import { peopleCopy } from "@/lib/i18n/copy/people";
import type { Language } from "@/types/shared";

/**
 * A people fiche's note callouts, allocated in reading order.
 *
 * Two numbering schemes meet on this page and they answer different questions.
 * A **note** is numbered by where it sits in the document — [1] is the first
 * sourced passage a reader meets — and a **source** is numbered by its place in
 * the fiche's bibliography. They do not correspond, and they must not pretend
 * to: the corpus attributes sources at the level of the fiche, so every field
 * of a fiche cites the same list. Printing a source's number in the prose would
 * therefore print the same digits after every paragraph, which is a decoration,
 * not a citation. The bridge between the two lives in the panel a callout
 * opens, where each source shows its bibliography number and a link.
 *
 * A pure module with no JSX, so the server component that composes the fiche
 * can call it.
 */

export type PeopleNoteSection = "origin" | "language" | "history" | "culture";

/**
 * Every prose field of the people fiche that can carry a callout, in the order
 * `PeopleDetailViewV2` renders its sections, and within each section the order
 * `public/modele-peuple.json` lists its fields.
 *
 * This constant is the single source of note numbering. A path that does not
 * match the corpus fails silently — the field simply never gets a callout —
 * which is why the charter test compares it against what the fiche renders.
 */
// @req REQ-019
export const PEOPLE_NOTE_FIELDS = [
  {
    path: "content.origins.ancientOrigins",
    section: "origin",
    key: "ancientOrigins",
  },
  {
    path: "content.origins.formationPeriod",
    section: "origin",
    key: "formationPeriod",
  },
  {
    path: "content.origins.unificationsOrDivisions",
    section: "origin",
    key: "unificationsOrDivisions",
  },
  {
    path: "content.origins.externalInfluences",
    section: "origin",
    key: "externalInfluences",
  },
  {
    path: "content.origins.majorHistoricalEvents",
    section: "origin",
    key: "majorHistoricalEvents",
  },
  {
    path: "content.languages.vehicularRole",
    section: "language",
    key: "vehicularRole",
  },
  {
    path: "content.historicalRole.kingdomsOrChiefdoms",
    section: "history",
    key: "kingdomsOrChiefdoms",
  },
  {
    path: "content.historicalRole.relationsWithNeighbors",
    section: "history",
    key: "relationsWithNeighbors",
  },
  {
    path: "content.historicalRole.conflictsOrAlliances",
    section: "history",
    key: "conflictsOrAlliances",
  },
  {
    path: "content.historicalRole.diaspora",
    section: "history",
    key: "diaspora",
  },
  {
    path: "content.culture.majorRites",
    section: "culture",
    key: "majorRites",
  },
  {
    path: "content.culture.symbols",
    section: "culture",
    key: "symbols",
  },
  {
    path: "content.culture.artsAndMusic",
    section: "culture",
    key: "artsAndMusic",
  },
  {
    path: "content.culture.spiritualities",
    section: "culture",
    key: "spiritualities",
  },
] as const satisfies ReadonlyArray<{
  path: string;
  section: PeopleNoteSection;
  key: string;
}>;

function noteLabels(language: Language) {
  const copy = peopleCopy[language];
  return {
    ancientOrigins: copy.originFields.ancientOrigins,
    formationPeriod: copy.originFields.formationPeriod,
    unificationsOrDivisions: copy.originFields.unifications,
    externalInfluences: copy.originFields.externalInfluences,
    majorHistoricalEvents: copy.originFields.majorEvents,
    vehicularRole: copy.languageFields.vehicularRole,
    kingdomsOrChiefdoms: copy.historyFields.kingdoms,
    relationsWithNeighbors: copy.historyFields.neighbours,
    conflictsOrAlliances: copy.historyFields.conflicts,
    diaspora: copy.historyFields.diaspora,
    majorRites: copy.cultureFields.majorRites,
    symbols: copy.cultureFields.symbols,
    artsAndMusic: copy.cultureFields.artsAndMusic,
    spiritualities: copy.cultureFields.spiritualities,
  };
}

/**
 * The DOM id a shared `#chip-…` link lands on.
 *
 * Derived from the field, never from the note number: inserting a chapter
 * renumbers every note below it, and a link already in circulation has to keep
 * meaning the same passage. `SourceChainSheet` opens itself when the hash
 * matches, so these anchors are a published surface.
 */
// @req REQ-019
export function noteAnchorId(fieldPath: string): string {
  return `chip-${fieldPath.replace(/\./g, "-").toLowerCase()}`;
}

/** What one callout needs, flat enough to cross the server/client boundary. */
export interface ParagraphNoteData {
  /** Its place in the fiche's reading order. */
  noteNumber: number;
  /** Content-addressed anchor, so a shared link survives a renumbering. */
  anchorId: string;
  fieldLabel: string;
  assertionId: string;
  assertionStatement: string;
  contested: boolean;
  sources: NoteSource[];
  /** Each source's place in the fiche's bibliography, for the panel to show. */
  numberBySourceId: Record<string, number>;
}

type NotesBySection = Record<string, ParagraphNoteData>;

export interface PeopleFicheNotes {
  origin: NotesBySection;
  language: NotesBySection;
  history: NotesBySection;
  culture: NotesBySection;
  /** How many callouts the fiche carries. */
  count: number;
}

// @req REQ-019
export function buildPeopleFicheNotes(
  notes: readonly FieldNote[],
  numberBySourceId: Record<string, number>,
  language: Language = "fr"
): PeopleFicheNotes {
  const byPath = new Map(notes.map((note) => [note.fieldPath, note]));

  const built: PeopleFicheNotes = {
    origin: {},
    language: {},
    history: {},
    culture: {},
    count: 0,
  };
  const labels = noteLabels(language);

  for (const field of PEOPLE_NOTE_FIELDS) {
    const note = byPath.get(field.path);
    // An unsourced field carries no callout, and consumes no number: a gap in
    // the sequence would read as a note the reader failed to find.
    if (!note) continue;

    built.count += 1;
    built[field.section][field.key] = {
      noteNumber: built.count,
      anchorId: noteAnchorId(field.path),
      fieldLabel: labels[field.key],
      assertionId: note.assertionId,
      assertionStatement: note.statement,
      contested: note.confidenceLevel === "contested",
      sources: note.sources,
      numberBySourceId: Object.fromEntries(
        note.sources
          .map((source) => [source.id, numberBySourceId[source.id]] as const)
          .filter(([, number]) => typeof number === "number")
      ),
    };
  }

  return built;
}
