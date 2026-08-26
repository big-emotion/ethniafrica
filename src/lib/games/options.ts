import type { QuizOptionValue } from "@/types/quiz";

/**
 * Option assembly shared by the quiz templates (REQ-080) and the eleven
 * games of the Jouer hub (REQ-120). Extracted from questionTemplates.ts,
 * where these were module-private, so a game can obey FR65/FR66 through
 * the same code path the quiz already proved.
 */

// @req REQ-103 @req REQ-120
export function isSameOptionValue(
  a: QuizOptionValue,
  b: QuizOptionValue
): boolean {
  const valueOf = (v: QuizOptionValue): string =>
    typeof v === "string" ? v : v.autonym;
  return valueOf(a) === valueOf(b);
}

/**
 * Picks exactly 3 distractors, verbatim, from the pool: excludes anything equal to the
 * correct answer and de-duplicates the pool itself. Returns null (no padding) if fewer
 * than 3 valid distractors remain — FR65/FR66 forbid fabricated options.
 */
// @req REQ-120
export function selectDistractors<T extends QuizOptionValue>(
  correct: T,
  pool: T[]
): T[] | null {
  const distractors: T[] = [];
  for (const candidate of pool) {
    if (isSameOptionValue(candidate, correct)) continue;
    if (distractors.some((existing) => isSameOptionValue(existing, candidate)))
      continue;
    distractors.push(candidate);
    if (distractors.length === 3) break;
  }
  return distractors.length === 3 ? distractors : null;
}

/**
 * Deterministic (no RNG) slot for the correct answer, stable across repeated calls.
 * `discriminator` is the quiz template id for a quiz question and the game id for a
 * game round: it keeps one entity from answering in the same slot on every surface.
 */
// @req REQ-120
export function correctOptionIndex(
  entityId: string,
  discriminator: string
): number {
  const seed = `${entityId}:${discriminator}`;
  let sum = 0;
  for (let i = 0; i < seed.length; i++) sum += seed.charCodeAt(i);
  return sum % 4;
}

// @req REQ-120
export function assembleOptions<T extends QuizOptionValue>(
  correct: T,
  distractors: T[],
  correctIndex: number
): T[] {
  const options: T[] = [];
  let distractorIndex = 0;
  for (let i = 0; i < 4; i++) {
    options.push(i === correctIndex ? correct : distractors[distractorIndex++]);
  }
  return options;
}
