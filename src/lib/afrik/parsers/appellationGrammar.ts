import type { NameRecordType } from "@/api/v2/schemas/names";

/**
 * Turns a people fiche's `content.appellations` into name records.
 *
 * The atlas of appellations was reading a dossier folder that covers eleven
 * peoples, while every one of the 790 fiches already carries its autonym and
 * its exonyms in prose. Deriving records from that prose is the obvious win
 * and the obvious trap: the fields are not name atoms. The corpus writes
 * "Kissi (terme utilisé par les Européens)", "Mankanya / Mankagne /
 * Mankague", and "Diverses appellations selon les sous-groupes" in the same
 * field, and a loader that took each string whole would publish a sentence
 * where the atlas promises a name.
 *
 * So this is a closed grammar, not a heuristic. It recognises exactly three
 * constructions the corpus actually uses — a semicolon between independent
 * appellations, a trailing parenthesis that glosses the name before it, and
 * slashes between spellings of one name — and it *refuses* everything else
 * rather than guessing. A refused segment is returned in `rejected` so the
 * fiche can be fixed by hand; it is never silently reshaped into a name.
 */

/** A segment reading like this describes appellations rather than being one. */
const DESCRIPTION_MARKERS = [
  "appellation",
  "designation",
  "désignation",
  "denomination",
  "dénomination",
  "variante",
  "orthographe",
  "divers",
  "selon",
  "propre",
  "utilise",
  "utilisé",
  "employe",
  "employé",
  "terme",
  "sous-groupe",
];

/**
 * A people's name runs to four words at most in this corpus — "Africains
 * d'origine recente" is the long tail. Beyond that the segment is a clause.
 */
const MAX_NAME_WORDS = 4;

export interface DerivedAppellation {
  nameText: string;
  nameType: NameRecordType;
  /** What the trailing parenthesis said, kept out of the name itself. */
  gloss: string | null;
  sortRank: number;
}

export interface AppellationDerivation {
  entries: DerivedAppellation[];
  /** Segments the grammar declined to read as a name, verbatim. */
  rejected: string[];
}

export interface AppellationsInput {
  selfAppellation?: string | null;
  exonyms?: readonly string[] | null;
}

// @req REQ-057
export function deriveAppellations({
  selfAppellation,
  exonyms,
}: AppellationsInput): AppellationDerivation {
  const entries: DerivedAppellation[] = [];
  const rejected: string[] = [];
  const seen = new Set<string>();

  const absorb = (raw: string | null | undefined, leadType: NameRecordType) => {
    for (const segment of splitAppellations(raw)) {
      const parsed = parseSegment(segment, leadType);
      if (!parsed) {
        rejected.push(segment);
        continue;
      }

      for (const candidate of parsed) {
        const key = candidate.nameText.toLocaleLowerCase("fr");
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        entries.push({ ...candidate, sortRank: entries.length });
      }
    }
  };

  absorb(selfAppellation, "endonym");
  for (const exonym of exonyms ?? []) {
    absorb(exonym, "exonym");
  }

  return { entries, rejected };
}

function splitAppellations(raw: string | null | undefined): string[] {
  if (typeof raw !== "string") {
    return [];
  }
  return raw
    .split(";")
    .map((segment) => segment.trim())
    .filter(Boolean);
}

/**
 * Returns the names one segment declares, or null when the grammar declines
 * to read it. The lead spelling keeps the declared type; the spellings after
 * it are variants of that same name, which is what `historical_spelling`
 * records.
 */
function parseSegment(
  segment: string,
  leadType: NameRecordType
): Omit<DerivedAppellation, "sortRank">[] | null {
  const { head, gloss } = peelGloss(segment);
  const spellings = head
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);

  if (spellings.length === 0 || !spellings.every(readsAsName)) {
    return null;
  }

  return spellings.map((nameText, index) => ({
    nameText,
    nameType: index === 0 ? leadType : ("historical_spelling" as const),
    // The gloss explains the segment, so it belongs to the lead spelling
    // rather than being repeated on each variant.
    gloss: index === 0 ? gloss : null,
  }));
}

function peelGloss(segment: string): { head: string; gloss: string | null } {
  const match = segment.match(/^(.*?)\s*\(([^()]*)\)\s*$/);
  if (!match) {
    return { head: segment.trim(), gloss: null };
  }
  return { head: match[1].trim(), gloss: match[2].trim() || null };
}

function readsAsName(candidate: string): boolean {
  if (!candidate) {
    return false;
  }

  const words = candidate.split(/\s+/).filter(Boolean);
  if (words.length > MAX_NAME_WORDS) {
    return false;
  }

  const folded = candidate.toLocaleLowerCase("fr");
  return !DESCRIPTION_MARKERS.some((marker) => folded.includes(marker));
}
