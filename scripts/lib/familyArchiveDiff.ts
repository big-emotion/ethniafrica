/**
 * Measures what the `archive/famille_linguistique/*.txt` → `*.json` conversion
 * left behind, section by section.
 *
 * The conversion lost content on more than half the families, and a character
 * ratio is not enough to say where: the `.txt` is markdown prose and the JSON is
 * structured, so part of any gap is markup. FLG_BERBERE keeps 21 % of its
 * archive's characters and has two entirely empty sections; FLG_KROU keeps 50 %
 * and has none — the same number means two different things.
 *
 * So this reports named anchors rather than a percentage. An anchor is a token
 * a restoration has to carry over or visibly drop: a year, a proper name, an
 * author-year citation. Comparison is accent- and case-insensitive, so a
 * section that rewords its prose keeps its anchors and is not reported.
 */

const SECTIONS: { heading: RegExp; target: string }[] = [
  {
    heading: /^##\s*HEADER\s+D[ÉE]COLONIAL/i,
    target: "content.decolonialHeader",
  },
  { heading: /^#\s*1\./, target: "content.generalInfo" },
  { heading: /^#\s*2\./, target: "content.associatedPeoples" },
  { heading: /^#\s*3\./, target: "content.linguisticCharacteristics" },
  { heading: /^#\s*4\./, target: "content.historyAndOrigins" },
  { heading: /^#\s*5\./, target: "content.distribution" },
  { heading: /^#\s*6\./, target: "content.sources" },
];

/** A heading that closes the section before it: any `#` that is not a `## 4.x`. */
const TOP_HEADING = /^#(?!#)/;
const SUB_HEADING = /^##\s+\d+\.\d+\.\s*(.+)$/;

/**
 * A year, not a fragment of a bigger number. "150 000 locuteurs" holds no year,
 * but a bare `\d{3,4}` reads two out of it, and the ratchet would then count
 * noise. Three-digit years are kept — the Rustamid dynasty is 776-909 — so the
 * test is positional: a group flanked by another group is a separator artefact.
 */
const YEAR = /(?<!\d[\s  ])\b\d{3,4}\b(?![\s  ]\d)/g;
const CITATION = /\b[A-ZÀ-Ý][\wÀ-ÿ-]+\s*\(\d{4}\)/g;
const PROPER_BIGRAM = /\b[A-ZÀ-Ý][a-zà-ÿ]{2,}\s+[A-ZÀ-Ý][a-zà-ÿ]{2,}\b/g;

export interface FamilySectionDiff {
  heading: string;
  target: string;
  emptyTarget: boolean;
  archiveChars: number;
  jsonChars: number;
  missingAnchors: string[];
  missingSubheadings: string[];
}

export interface FamilyArchiveDiff {
  familyId: string;
  charRatio: number;
  totalMissingAnchors: number;
  sections: FamilySectionDiff[];
}

export function normalise(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function sectionBody(lines: string[], startIndex: number): string {
  const body: string[] = [];
  for (let i = startIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (TOP_HEADING.test(line)) break;
    body.push(line);
  }
  return body.join("\n");
}

/** The tokens a restoration has to carry over, or visibly decide to drop. */
function anchorsIn(text: string): string[] {
  const found = new Set<string>();
  for (const match of text.match(CITATION) ?? []) found.add(match.trim());
  for (const match of text.match(PROPER_BIGRAM) ?? []) found.add(match.trim());
  for (const match of text.match(YEAR) ?? []) found.add(match.trim());
  return [...found].sort();
}

function textOf(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function isEmptyTarget(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
}

function resolve(fiche: unknown, dottedPath: string): unknown {
  return dottedPath
    .split(".")
    .reduce<unknown>(
      (node, key) =>
        node && typeof node === "object"
          ? (node as Record<string, unknown>)[key]
          : undefined,
      fiche
    );
}

export function diffFamilyArchive(
  familyId: string,
  archiveText: string,
  fiche: unknown
): FamilyArchiveDiff {
  const lines = archiveText.split("\n");
  const jsonText = JSON.stringify(fiche);

  const sections = SECTIONS.map(({ heading, target }) => {
    const index = lines.findIndex((line) => heading.test(line));
    const body = index === -1 ? "" : sectionBody(lines, index);
    const targetValue = resolve(fiche, target);
    const targetText = normalise(textOf(targetValue));

    const missingAnchors = anchorsIn(body).filter(
      (anchor) => !targetText.includes(normalise(anchor))
    );

    const emptyTarget = body.trim() !== "" && isEmptyTarget(targetValue);

    // Only listed for a section that vanished whole. On a section that still
    // holds prose the titles are worthless as a signal: restored content
    // rewords its subject, so "Événements historiques majeurs" reads as
    // missing while every event it covers is present. The anchors are the
    // measure there, and a signal that stays red on correct content teaches
    // people to ignore it.
    const missingSubheadings = emptyTarget
      ? body.split("\n").flatMap((line) => {
          const match = line.match(SUB_HEADING);
          return match ? [match[1].trim()] : [];
        })
      : [];

    return {
      heading: index === -1 ? `(absent) ${target}` : lines[index].trim(),
      target,
      emptyTarget,
      archiveChars: body.length,
      jsonChars: textOf(targetValue).length,
      missingAnchors,
      missingSubheadings,
    };
  });

  return {
    familyId,
    charRatio:
      archiveText.length === 0
        ? 0
        : Number((jsonText.length / archiveText.length).toFixed(3)),
    totalMissingAnchors: sections.reduce(
      (total, section) => total + section.missingAnchors.length,
      0
    ),
    sections,
  };
}
