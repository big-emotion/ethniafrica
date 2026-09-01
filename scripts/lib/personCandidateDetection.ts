import type {
  LoadedPeopleFiche,
  PersonCandidate,
} from "./personCandidateTypes";

const ROLE_CUE_SOURCE = [
  "rois?",
  "reines?",
  "reine-m[eè]res?",
  "chefs?",
  "empereurs?",
  "imp[eé]ratrices?",
  "fondateurs?",
  "fondatrices?",
  "dirigeants?",
  "leaders?",
  "guerriers?",
  "guerri[eè]res?",
  "explorateurs?",
  "exploratrices?",
  "[eé]crivains?",
  "philosophes?",
  "proph[eè]tes?",
  "sultans?",
  "califes?",
  "pr[eé]sidents?",
  "po[eè]tes?",
  "historiens?",
  "linguistes?",
  "anthropologues?",
  "ethnographes?",
  "missionnaires?",
  "h[eé]ros",
  "h[eé]ro[iï]nes?",
  "king",
  "queen",
  "emperor",
  "founders?",
  "explorers?",
  "writers?",
  "philosophers?",
  "prophets?",
  "warriors?",
  "caliphs?",
  "presidents?",
  "poets?",
  "historians?",
].join("|");

const ROLE_CUE_GLOBAL = new RegExp(`\\b(?:${ROLE_CUE_SOURCE})\\b`, "giu");
const SENTENCE = /[^.!?]+(?:[.!?]+|$)/gu;
const NAME_PARTICLE =
  "(?:d['’ʼ]|da|de|del|della|di|du|des|van|von|bin|banu|ait|al|el)";
const NAME_TOKEN = "\\p{Lu}[\\p{L}\\p{M}'’ʼ-]*";
const NAME_SOURCE = `(?:${NAME_PARTICLE}\\s+)?${NAME_TOKEN}(?:\\s+(?:${NAME_PARTICLE}\\s+)?${NAME_TOKEN}){0,3}`;
const FILLER_WORD = "\\p{Ll}+";
const NAME_AFTER_CUE = new RegExp(
  `^\\s+(?:${FILLER_WORD}\\s+){0,2}(${NAME_SOURCE})`,
  "u"
);

const NON_NARRATIVE_CONTENT_KEYS = new Set(["demography", "sources"]);

interface StringValue {
  sourcePath: string;
  value: string;
}

/** Normalize identity only; the original spelling remains the display name. */
export function normalizePersonName(name: string): string {
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

interface PersonOccurrence {
  name: string;
  roleCue: string;
}

function candidateOccurrencesFromPassage(passage: string): PersonOccurrence[] {
  const occurrences: PersonOccurrence[] = [];

  for (const sentence of passage.match(SENTENCE) ?? []) {
    for (const cue of sentence.matchAll(ROLE_CUE_GLOBAL)) {
      const afterCue = sentence.slice((cue.index ?? 0) + cue[0].length);
      const nameMatch = afterCue.match(NAME_AFTER_CUE);
      if (!nameMatch) continue;

      occurrences.push({ name: nameMatch[1], roleCue: cue[0].toLowerCase() });
    }
  }

  return occurrences;
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
 * Detect named-person review candidates while retaining occurrence provenance.
 * A candidate is only ever produced from a real sentence in the fiche prose —
 * there is no code path that creates one without a verbatimPassage (REQ-126).
 */
export function detectPersonCandidates(
  fiche: LoadedPeopleFiche
): PersonCandidate[] {
  const stringValues: StringValue[] = [];
  collectStringValues(fiche.content, "content", stringValues);

  const candidates: PersonCandidate[] = [];
  for (const { sourcePath, value: verbatimPassage } of stringValues) {
    const normalizedNamesAtPath = new Set<string>();

    for (const { name, roleCue } of candidateOccurrencesFromPassage(
      verbatimPassage
    )) {
      const normalizedName = normalizePersonName(name);
      if (!normalizedName || normalizedNamesAtPath.has(normalizedName))
        continue;
      normalizedNamesAtPath.add(normalizedName);

      candidates.push({
        candidateId: makeCandidateId(fiche.id, sourcePath, normalizedName),
        name,
        normalizedName,
        roleCue,
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
