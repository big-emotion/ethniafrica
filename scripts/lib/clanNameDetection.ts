import type { ClanNameCandidate, LoadedPeopleFiche } from "./clanNameTypes";

const NAMING_CUE_SOURCE = [
  "clans?",
  "lignages?",
  "lineages?",
  "patronymes?",
  "surnames?",
  "noms?\\s+de\\s+famille",
  "family\\s+names?",
  "familles?\\s+patronymiques?",
  "patronymic\\s+famil(?:y|ies)",
].join("|");

const NAMING_CUE = new RegExp(`\\b(?:${NAMING_CUE_SOURCE})\\b`, "iu");
const NAMING_CUE_GLOBAL = new RegExp(`\\b(?:${NAMING_CUE_SOURCE})\\b`, "giu");
const SENTENCE = /[^.!?]+(?:[.!?]+|$)/gu;
const NAME_PARTICLE =
  "(?:d['’ʼ]|da|de|del|della|di|du|des|van|von|bin|banu|ait|al|el)";
const NAME_TOKEN = "[ǀǁǂǃ!|]*\\p{Lu}[\\p{L}\\p{M}'’ʼ-]*";
const NAME_SOURCE = `(?:${NAME_PARTICLE}\\s+)?${NAME_TOKEN}(?:\\s+(?:${NAME_PARTICLE}\\s+)?${NAME_TOKEN})*`;
const NAME_AT_START = new RegExp(`^${NAME_SOURCE}`, "u");
const LIST_INTRODUCER = new RegExp(
  `^\\s*(?:comme|tels?\\s+que|notamment|incluent|comprennent|portent|sont|including|include|such\\s+as)\\s+(.+)$`,
  "iu"
);

const NON_NARRATIVE_CONTENT_KEYS = new Set(["demography", "sources"]);

interface StringValue {
  sourcePath: string;
  value: string;
}

/** Normalize identity only; the original spelling remains the display name. */
export function normalizeClanName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[’ʼ]/gu, "'")
    .replace(/[‐‑‒–—―]/gu, "-")
    .toLocaleLowerCase("fr")
    .trim()
    .replace(/\s+/gu, " ");
}

function collectStringValues(
  value: unknown,
  sourcePath: string,
  values: StringValue[]
): void {
  if (typeof value === "string") {
    values.push({ sourcePath, value });
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      collectStringValues(item, `${sourcePath}[${index}]`, values)
    );
    return;
  }

  if (value === null || typeof value !== "object") return;

  for (const key of Object.keys(value).sort()) {
    if (sourcePath === "content" && NON_NARRATIVE_CONTENT_KEYS.has(key)) {
      continue;
    }
    collectStringValues(
      (value as Record<string, unknown>)[key],
      `${sourcePath}.${key}`,
      values
    );
  }
}

function candidateNamesFromPassage(passage: string): string[] {
  const names: string[] = [];
  const proseForParsing = passage.replace(/\betc\./giu, "etc");

  for (const sentence of proseForParsing.match(SENTENCE) ?? []) {
    if (!NAMING_CUE.test(sentence)) continue;

    const cueMatches = [...sentence.matchAll(NAMING_CUE_GLOBAL)];

    // Parenthesized lists are the strongest corpus signal. Prefer them over
    // nearby people or place names in the surrounding sentence.
    const parenthesizedList = cueMatches
      .flatMap((cue) => {
        const afterCue = sentence.slice((cue.index ?? 0) + cue[0].length);
        return [...afterCue.matchAll(/\(([^()]*)\)/gu)].map(
          (match) => match[1]
        );
      })
      .map(parseNameList)
      .find((candidateList) => candidateList.length >= 2);

    if (parenthesizedList) {
      names.push(...parenthesizedList);
      continue;
    }

    for (const cue of cueMatches) {
      const afterCue = sentence.slice((cue.index ?? 0) + cue[0].length);
      const colonIndex = afterCue.indexOf(":");
      if (colonIndex !== -1) {
        names.push(...parseNameList(afterCue.slice(colonIndex + 1)));
        continue;
      }

      const introducedList = afterCue.match(LIST_INTRODUCER)?.[1];
      if (introducedList) {
        names.push(...parseNameList(introducedList));
        continue;
      }

      names.push(...parseNameList(afterCue));
    }
  }

  return names;
}

function stripParentheticalQualifiers(value: string): string {
  let depth = 0;
  let result = "";

  for (const character of value) {
    if (character === "(") {
      depth += 1;
    } else if (character === ")") {
      depth = Math.max(0, depth - 1);
    } else if (depth === 0) {
      result += character;
    }
  }

  return result;
}

function parseNameList(value: string): string[] {
  const names = stripParentheticalQualifiers(value)
    .split(/\s*(?:,|;|\/|\bet\b|\bou\b|\band\b|\bor\b)\s*/iu)
    .map((part) => part.trim().match(NAME_AT_START)?.[0] ?? "");

  if (!names[0]) {
    return [];
  }

  return names.filter(Boolean);
}

function makeCandidateId(
  ficheId: string,
  sourcePath: string,
  normalizedName: string
): string {
  return [ficheId, sourcePath, normalizedName]
    .map((part) => encodeURIComponent(part))
    .join("::");
}

/**
 * Detect review candidates in prose while retaining occurrence provenance.
 * A repeated spelling variant is collapsed only inside the same fiche path.
 */
export function detectClanNameCandidates(
  fiche: LoadedPeopleFiche
): ClanNameCandidate[] {
  const stringValues: StringValue[] = [];
  collectStringValues(fiche.content, "content", stringValues);

  const candidates: ClanNameCandidate[] = [];
  for (const { sourcePath, value: verbatimPassage } of stringValues) {
    const normalizedNamesAtPath = new Set<string>();

    for (const name of candidateNamesFromPassage(verbatimPassage)) {
      const normalizedName = normalizeClanName(name);
      if (!normalizedName || normalizedNamesAtPath.has(normalizedName))
        continue;
      normalizedNamesAtPath.add(normalizedName);

      candidates.push({
        candidateId: makeCandidateId(fiche.id, sourcePath, normalizedName),
        name,
        normalizedName,
        sourceFicheId: fiche.id,
        linguisticFamilyId: fiche.languageFamilyId,
        sourcePath,
        verbatimPassage,
        sourceCandidates: [],
        inheritedTier: null,
        sourceKind: null,
        tierResolution: "review_required",
        reviewFlags: [],
        reviewStatus: "unreviewed",
      });
    }
  }

  return candidates;
}
