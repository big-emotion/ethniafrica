import type { FicheSourceEntry } from "@/lib/afrik/ficheSourceLabel";
import { isSourceTier, type SourceTier } from "@/types/sources";

/**
 * A fiche's bibliography, numbered.
 *
 * A note callout is a number, and a number has to index something the reader
 * can reach — otherwise it is decoration. What it indexes is this: the list at
 * the foot of the fiche, with one number per source, stable across the page.
 *
 * Two sets meet here and neither is authoritative alone. The fiche JSON holds
 * what the editors declared and the order they declared it in; the `sources`
 * table holds what an assertion actually cites, with the identifier a link
 * needs. They overlap heavily — the loader wrote the table from the JSON — but
 * they can drift, and the rules below decide which way the drift falls:
 *
 *   the JSON is authoritative for **presence and order**,
 *   the table is authoritative for **identity and detail**,
 *   and the union is taken, never the intersection.
 *
 * The union is not a preference. A cited source with no number would leave a
 * callout pointing at nothing, and a declared source deleted for want of a
 * citation would rewrite what the fiche says it rests on. Both are worse than
 * a bibliography one entry longer than either list.
 */

/** A source of the `sources` table, in the shape a citation needs. */
export interface CitedSource {
  id: string;
  title: string;
  url?: string | null;
  tier?: SourceTier | null;
  notes?: string | null;
}

export interface RegisteredSource {
  /** Its place in this fiche's bibliography, from 1. */
  number: number;
  label: string;
  url: string | null;
  standing: SourceTier | "needs_review";
  notes?: string;
  /** Present when the table knows this source, which is what a note cites. */
  sourceId?: string;
}

export interface FicheSourceRegister {
  entries: RegisteredSource[];
  /** Source id to its number, so a note can print one without a search. */
  numberBySourceId: Record<string, number>;
}

/**
 * The join the two sets already share.
 *
 * The AFRIK loaders upsert sources with `onConflict: "title"`, so the title is
 * how a row in the table came to *be* one row rather than several. Matching on
 * anything else here would invent a second identity for the same work.
 */
function titleKey(title: string): string {
  return title.normalize("NFC").replace(/\s+/g, " ").trim().toLocaleLowerCase();
}

// @req REQ-092
export function buildFicheSourceRegister(
  declared: readonly FicheSourceEntry[],
  cited: readonly CitedSource[]
): FicheSourceRegister {
  const entries: RegisteredSource[] = [];
  const byTitle = new Map<string, RegisteredSource>();

  for (const entry of declared) {
    const key = titleKey(entry.label);
    // Two declarations of one title fold onto one number: the table calls them
    // a single row, and showing "3" and "7" would promise a distinction the
    // database cannot keep.
    if (byTitle.has(key)) continue;

    const registered: RegisteredSource = {
      number: entries.length + 1,
      label: entry.label,
      url: entry.url,
      standing: entry.standing,
      ...(entry.notes === undefined ? {} : { notes: entry.notes }),
    };
    entries.push(registered);
    byTitle.set(key, registered);
  }

  const numberBySourceId: Record<string, number> = {};

  for (const source of cited) {
    const key = titleKey(source.title);
    const matched = byTitle.get(key);

    if (matched) {
      matched.sourceId = source.id;
      // The table fills what the declaration left blank and overwrites
      // nothing: a re-sourcing must not silently retitle a fiche's own list.
      if (!matched.url && source.url) matched.url = source.url;
      if (matched.notes === undefined && source.notes) {
        matched.notes = source.notes;
      }
      numberBySourceId[source.id] = matched.number;
      continue;
    }

    const added: RegisteredSource = {
      number: entries.length + 1,
      label: source.title,
      url: source.url ?? null,
      standing: isSourceTier(source.tier) ? source.tier : "needs_review",
      ...(source.notes ? { notes: source.notes } : {}),
      sourceId: source.id,
    };
    entries.push(added);
    byTitle.set(key, added);
    numberBySourceId[source.id] = added.number;
  }

  return { entries, numberBySourceId };
}
