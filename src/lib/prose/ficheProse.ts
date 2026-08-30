/**
 * The closed markup grammar the AFRIK corpus writes its prose in.
 *
 * The grammar is explicit rather than inferred, and that is the whole design.
 * A measurement over the 385 bold runs in the family fiches settled it: only
 * 162 are segment-initial and colon-terminated, 130 are true mid-sentence
 * emphasis, and 93 are segment-initial without a colon — indistinguishable.
 * A "bold plus colon is a heading" rule would turn `trois familles :
 * **Khoe-Kwadi**, **Kx'a**, et **Tuu**` into three headings mid-sentence.
 *
 * The argument that settles it alone: a heuristic renderer cannot have a CI
 * gate. If "well-formed" is not decidable by a rule, `check:text-shape` has
 * nothing to check. So the corpus carries `## ` and a leading `- `, and the
 * newline is the block separator — the one separator provably free, with zero
 * occurrences across the 895 fiches.
 *
 * Everything outside the grammar renders literally. Rendering it as markup
 * would turn a fiche into an injection vector, so this module returns nodes to
 * describe, never HTML.
 */

export type ProseInline =
  | { kind: "text"; value: string }
  | { kind: "strong"; value: string }
  | { kind: "em"; value: string };

export type ProseBlock =
  | { kind: "heading"; inline: ProseInline[] }
  | { kind: "paragraph"; inline: ProseInline[] }
  | { kind: "list"; items: ProseInline[][] };

/** Why a field could not be read as prose. `null` means it was clean. */
export type ProseDefect =
  | "serialised-json"
  | "unbalanced-emphasis"
  | "orphan-heading"
  | "unsupported-construct";

export interface ParsedProse {
  blocks: ProseBlock[];
  defect: ProseDefect | null;
}

/**
 * The title group is optional so that a bare `## ` — which trims down to `##` —
 * is still recognised as a heading marker, and reported as carrying no title
 * rather than falling through to a paragraph that would print the hashes.
 */
const HEADING = /^##(?:\s+(.*))?$/;
const LIST_ITEM = /^-\s+(.*)$/;
const INLINE_RUN = /(\*\*|\*)(?!\s)([\s\S]+?)(?<!\s)\1/g;

/**
 * Constructs a reader may legitimately meet in the corpus but the grammar does
 * not carry. They pass through as text; only the linter names them, because a
 * page that scolded its reader about corpus debt would be the wrong surface for
 * the complaint.
 */
const UNSUPPORTED = [
  /\[[^\]\n]+\]\([^)\n]+\)/, // markdown link — sources link, prose does not
  /(^|\n)\s*\d+\.\s/, // ordered list
  /(^|\n)#(?!#\s)#*\s/, // any heading depth but two
  /(^|\n)\s*>\s/, // block quote
  /\|[^\n|]*\|/, // table row
  /`[^`\n]+`/, // inline code
];

/** A field whose first non-blank character opens a JSON document. */
function isSerialisedJson(raw: string): boolean {
  const head = raw.trimStart()[0];
  if (head !== "{" && head !== "[") return false;
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null;
  } catch {
    return false;
  }
}

/**
 * `**` and `*` runs, non-greedy and non-nesting. An unpaired marker survives as
 * text, which doubles as the escape hatch: there is no second one.
 */
function parseInline(line: string): ProseInline[] {
  const inline: ProseInline[] = [];
  let cursor = 0;

  INLINE_RUN.lastIndex = 0;
  let run: RegExpExecArray | null;
  while ((run = INLINE_RUN.exec(line)) !== null) {
    if (run.index > cursor) {
      inline.push({ kind: "text", value: line.slice(cursor, run.index) });
    }
    inline.push({
      kind: run[1] === "**" ? "strong" : "em",
      value: run[2],
    });
    cursor = run.index + run[0].length;
  }

  if (cursor < line.length) {
    inline.push({ kind: "text", value: line.slice(cursor) });
  }
  return inline.length > 0 ? inline : [{ kind: "text", value: "" }];
}

/**
 * A leading asterisk glued to a word is the linguist's reconstructed form —
 * `*-ntu`, the Proto-Bantu root, or `*-tambiko` — not a markup marker that
 * failed to close. In an atlas of languages that notation is load-bearing, so
 * it can never be a defect; the corpus carries six of them.
 *
 * The trailing case is the opposite and is always broken: `…de diachronie*.
 * Paris` is a source title whose opening marker went missing with the author's
 * name. Attachment side is what separates the two.
 */
const RECONSTRUCTED_FORM = /(?<![*\w])\*-?[\p{L}][\p{L}\p{M}\d'’ǀǁǃǂ-]*/gu;

/**
 * A marker that never closed.
 *
 * Order matters: the paired runs come out first, or `*ǃXóõ*` would be read as a
 * reconstructed form followed by a stray asterisk and reported as broken.
 */
function hasUnbalancedEmphasis(raw: string): boolean {
  if ((raw.match(/\*\*/g) ?? []).length % 2 !== 0) return true;

  const leftover = raw
    .replace(/\*\*(?!\s)[\s\S]+?(?<!\s)\*\*/g, "")
    .replace(/\*\*/g, "")
    .replace(/\*(?!\s)[\s\S]+?(?<!\s)\*/g, "")
    .replace(RECONSTRUCTED_FORM, "");

  return leftover.includes("*");
}

/**
 * Total by construction: never throws, never loops — every branch consumes a
 * whole line — and never produces markup.
 */
// @req REQ-122
export function parseFicheProse(raw: string): ParsedProse {
  if (!raw || raw.trim() === "") return { blocks: [], defect: null };
  if (isSerialisedJson(raw)) return { blocks: [], defect: "serialised-json" };

  const blocks: ProseBlock[] = [];
  let defect: ProseDefect | null = hasUnbalancedEmphasis(raw)
    ? "unbalanced-emphasis"
    : null;

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "") continue;

    const heading = HEADING.exec(trimmed);
    if (heading) {
      // A heading marker carrying no title has nothing to name.
      if (!heading[1] || heading[1].trim() === "") {
        defect ??= "orphan-heading";
        continue;
      }
      blocks.push({ kind: "heading", inline: parseInline(heading[1].trim()) });
      continue;
    }
    // `## ` with no space, and every other depth, are not headings.
    if (/^##/.test(trimmed)) {
      blocks.push({ kind: "paragraph", inline: parseInline(trimmed) });
      continue;
    }

    const item = LIST_ITEM.exec(trimmed);
    if (item) {
      const previous = blocks[blocks.length - 1];
      if (previous?.kind === "list") {
        previous.items.push(parseInline(item[1]));
      } else {
        blocks.push({ kind: "list", items: [parseInline(item[1])] });
      }
      continue;
    }

    blocks.push({ kind: "paragraph", inline: parseInline(trimmed) });
  }

  // A heading with nothing under it is not a heading. The people fiche charter
  // already forbids printing a heading the fiche has nothing to put under; the
  // renderer must not reopen from below a door closed from above.
  const last = blocks[blocks.length - 1];
  if (last?.kind === "heading") {
    blocks[blocks.length - 1] = { kind: "paragraph", inline: last.inline };
    defect ??= "orphan-heading";
  }

  return { blocks, defect };
}

/**
 * The prose alone, for the quiz stimulus and the assertion statement.
 *
 * Headings and list items are dropped rather than flattened. A heading is
 * navigation furniture, not a claim — and it carries no terminal punctuation,
 * so joining it to the paragraph below would forge a sentence that
 * `selectVerbatimFragment` could not split, and the fragment would stop being
 * verbatim. Serialised JSON yields nothing, which is what stops a malformed
 * field from becoming an assertion.
 */
// @req REQ-122
export function plainTextOf(raw: string): string {
  const { blocks } = parseFicheProse(raw);
  return blocks
    .filter((block) => block.kind === "paragraph")
    .map((block) =>
      block.kind === "paragraph"
        ? block.inline.map((run) => run.value).join("")
        : ""
    )
    .join(" ")
    .trim();
}

/**
 * Every defect in a field, not just the first one the renderer tripped over.
 * The renderer must stay total and cheap — it runs for eleven chapters inside a
 * server component — while the gate must be exhaustive. One function could not
 * be both without being either slow or lax.
 */
// @req REQ-122
export function lintFicheProse(raw: string): ProseDefect[] {
  if (!raw || raw.trim() === "") return [];

  const defects: ProseDefect[] = [];
  if (isSerialisedJson(raw)) return ["serialised-json"];
  if (hasUnbalancedEmphasis(raw)) defects.push("unbalanced-emphasis");
  if (UNSUPPORTED.some((pattern) => pattern.test(raw))) {
    defects.push("unsupported-construct");
  }

  const { defect } = parseFicheProse(raw);
  if (defect === "orphan-heading") defects.push("orphan-heading");

  return defects;
}

/**
 * The quiz boundary, in the shape the rubric readers already pass around.
 *
 * A rubric feeds `selectVerbatimFragment`, whose fragment becomes a stimulus on
 * screen and an `assertions.statement` row in the database. Markup reaching
 * either would show through, and would spend the fragment's 400-character
 * budget four characters at a time.
 *
 * A field that holds no prose yields `null` rather than an empty string, so the
 * template returns null and no round is built from it. That is what stops the
 * 94 serialised-JSON fields from being sliced on the periods inside their own
 * braces and written out as claims the fiche never made.
 */
// @req REQ-122
export function proseOnly(
  value: string | string[] | null | undefined
): string | string[] | null | undefined {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    return value.map(plainTextOf).filter((entry) => entry !== "");
  }
  return plainTextOf(value) || null;
}
