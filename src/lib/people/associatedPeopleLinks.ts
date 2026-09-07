import { normalizeString } from "@/lib/normalize";

export interface PeopleNameIndexEntry {
  /** PPL_* identifier of a people the corpus holds a fiche for. */
  id: string;
  nameMain: string;
}

export interface AssociatedGroup {
  /** The corpus entry, verbatim — the group name plus its prose gloss. */
  label: string;
  /** The fiche this group names, when exactly one people carries that name. */
  peopleId?: string;
}

/**
 * Punctuation the corpus uses to hang a prose gloss off a group name, e.g.
 * "Karanga — sous-groupe dominant du centre-sud du Zimbabwe". A bare hyphen is
 * absent on purpose: it belongs to compound autonyms such as "Bantou-Sud".
 */
const GLOSS_SEPARATORS = [" — ", " – ", " - ", " ("];

const readGroupName = (entry: string): string => {
  let glossStart = entry.length;
  for (const separator of GLOSS_SEPARATORS) {
    const at = entry.indexOf(separator);
    if (at !== -1 && at < glossStart) {
      glossStart = at;
    }
  }
  return entry.slice(0, glossStart).trim();
};

/**
 * Spacing and punctuation vary between an `ethnicities` entry and the fiche's
 * own `nameMain` ("Bantou-Sud" vs "Bantou Sud"), so they are dropped on top of
 * the shared accent- and case-folding rather than by changing that util.
 */
const matchKey = (name: string): string =>
  normalizeString(name).replace(/[^\p{L}\p{N}]+/gu, "");

/**
 * Turns each `content.ethnicities` entry of a people fiche into a reference to
 * the fiche it names, when the corpus holds exactly one.
 *
 * Most entries name a sub-group with no fiche of its own — 315 of the 4050
 * entries measured across the 776 people fiches resolve — so an unresolved
 * entry is the normal outcome and is returned with its label alone.
 *
 * @req REQ-150
 */
export function resolveAssociatedPeoples(
  entries: readonly string[],
  index: readonly PeopleNameIndexEntry[],
  selfId?: string
): AssociatedGroup[] {
  const fichesByName = new Map<string, Set<string>>();
  for (const fiche of index) {
    if (selfId && fiche.id === selfId) continue;
    const key = matchKey(fiche.nameMain);
    if (!key) continue;
    const carriers = fichesByName.get(key);
    if (carriers) {
      carriers.add(fiche.id);
    } else {
      fichesByName.set(key, new Set([fiche.id]));
    }
  }

  return entries.map((entry) => {
    const carriers = fichesByName.get(matchKey(readGroupName(entry)));
    // A name two fiches carry would assert an identity the corpus does not make.
    if (!carriers || carriers.size !== 1) {
      return { label: entry };
    }
    return { label: entry, peopleId: [...carriers][0] };
  });
}
