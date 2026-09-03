import type {
  FieldNote,
  NoteSource,
} from "@/lib/supabase/queries/afrik/module-zero-batch";

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
    label: "Origines anciennes",
  },
  {
    path: "content.origins.formationPeriod",
    section: "origin",
    key: "formationPeriod",
    label: "Période de formation",
  },
  {
    path: "content.origins.unificationsOrDivisions",
    section: "origin",
    key: "unificationsOrDivisions",
    label: "Unifications & divisions",
  },
  {
    path: "content.origins.externalInfluences",
    section: "origin",
    key: "externalInfluences",
    label: "Influences extérieures",
  },
  {
    path: "content.origins.majorHistoricalEvents",
    section: "origin",
    key: "majorHistoricalEvents",
    label: "Événements majeurs",
  },
  {
    path: "content.languages.vehicularRole",
    section: "language",
    key: "vehicularRole",
    label: "Rôle véhiculaire",
  },
  {
    path: "content.historicalRole.kingdomsOrChiefdoms",
    section: "history",
    key: "kingdomsOrChiefdoms",
    label: "Royaumes & chefferies",
  },
  {
    path: "content.historicalRole.relationsWithNeighbors",
    section: "history",
    key: "relationsWithNeighbors",
    label: "Relations avec les voisins",
  },
  {
    path: "content.historicalRole.conflictsOrAlliances",
    section: "history",
    key: "conflictsOrAlliances",
    label: "Conflits & alliances",
  },
  {
    path: "content.historicalRole.diaspora",
    section: "history",
    key: "diaspora",
    label: "Diaspora",
  },
  {
    path: "content.culture.majorRites",
    section: "culture",
    key: "majorRites",
    label: "Rites majeurs",
  },
  {
    path: "content.culture.symbols",
    section: "culture",
    key: "symbols",
    label: "Symboles",
  },
  {
    path: "content.culture.artsAndMusic",
    section: "culture",
    key: "artsAndMusic",
    label: "Arts & musique",
  },
  {
    path: "content.culture.spiritualities",
    section: "culture",
    key: "spiritualities",
    label: "Spiritualités",
  },
] as const satisfies ReadonlyArray<{
  path: string;
  section: PeopleNoteSection;
  key: string;
  label: string;
}>;

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
  numberBySourceId: Record<string, number>
): PeopleFicheNotes {
  const byPath = new Map(notes.map((note) => [note.fieldPath, note]));

  const built: PeopleFicheNotes = {
    origin: {},
    language: {},
    history: {},
    culture: {},
    count: 0,
  };

  for (const field of PEOPLE_NOTE_FIELDS) {
    const note = byPath.get(field.path);
    // An unsourced field carries no callout, and consumes no number: a gap in
    // the sequence would read as a note the reader failed to find.
    if (!note) continue;

    built.count += 1;
    built[field.section][field.key] = {
      noteNumber: built.count,
      anchorId: noteAnchorId(field.path),
      fieldLabel: field.label,
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
