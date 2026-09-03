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

/**
 * Splits on `separator`, but only where no parenthesis is open.
 *
 * The corpus writes its glosses in prose, and that prose contains the same
 * `;` and `/` the grammar uses as separators — "Habesha (አበሻ — amharique;
 * ሓበሻ — tigrinya)". A plain `String.split` cut inside the gloss and left
 * `peelGloss` with a segment whose closing parenthesis had moved to the next
 * one, so the parenthesis survived into the published name.
 */
function splitOutsideParens(value: string, separator: string): string[] {
  const segments: string[] = [];
  let depth = 0;
  let start = 0;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === "(") {
      depth += 1;
    } else if (character === ")") {
      // Floored rather than allowed to go negative: a stray closing
      // parenthesis must not make every later separator look nested.
      depth = Math.max(0, depth - 1);
    } else if (character === separator && depth === 0) {
      segments.push(value.slice(start, index));
      start = index + 1;
    }
  }
  segments.push(value.slice(start));

  return segments.map((segment) => segment.trim()).filter(Boolean);
}

function splitAppellations(raw: string | null | undefined): string[] {
  if (typeof raw !== "string") {
    return [];
  }
  return splitOutsideParens(raw, ";");
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
  // Split before peeling, and peel each spelling in turn. `peelGloss` only
  // reads a *trailing* parenthesis, so peeling the segment first left the
  // gloss of every spelling but the last buried inside a name — which is why
  // "Habesha (አበሻ — amharique) / Habeshat (ge'ez)" was refused outright
  // rather than read as the two names it declares.
  const spellings = splitOutsideParens(segment, "/").map(peelGloss);

  if (
    spellings.length === 0 ||
    !spellings.every(({ head }) => readsAsName(head))
  ) {
    return null;
  }

  return spellings.map(({ head, gloss }, index) => ({
    nameText: head,
    nameType: index === 0 ? leadType : ("historical_spelling" as const),
    gloss,
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

  // A parenthesis that survived `peelGloss` means the source left one
  // unclosed. The segment is prose the grammar failed to read, not a name,
  // and publishing it is how "Abaha (endonyme" reached the atlas.
  if (candidate.includes("(") || candidate.includes(")")) {
    return false;
  }

  const words = candidate.split(/\s+/).filter(Boolean);
  if (words.length > MAX_NAME_WORDS) {
    return false;
  }

  const folded = candidate.toLocaleLowerCase("fr");
  return !DESCRIPTION_MARKERS.some((marker) => folded.includes(marker));
}
