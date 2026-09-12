import {
  detectProseCandidates,
  normalizeCandidateName,
} from "./peopleProseCandidates";
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

/** Normalize identity only; the original spelling remains the display name. */
export const normalizePersonName = normalizeCandidateName;

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

/**
 * Detect named-person review candidates while retaining occurrence provenance.
 * A candidate is only ever produced from a real sentence in the fiche prose —
 * there is no code path that creates one without a verbatimPassage (REQ-126).
 */
export function detectPersonCandidates(
  fiche: LoadedPeopleFiche
): PersonCandidate[] {
  return detectProseCandidates(fiche, candidateOccurrencesFromPassage);
}
