/**
 * What a quiz session is drawn from, and in what order it climbs.
 *
 * This replaces the audience axis (children / teens / adults / university /
 * professionals) that `segmentPolicy.ts` used to carry. Two things follow from
 * that swap, and both are the point of it:
 *
 *  - **The bank stops being duplicated.** One question existed five times over,
 *    once per audience, because `audience` was part of its identity. 11 879
 *    rows were 2 504 distinct questions. Dropping the axis does not shrink the
 *    bank; it stops counting the same question five times.
 *  - **Difficulty has to be recomputed, not clamped.** An audience carried a
 *    rung range and that is where a session's difficulty came from. A scope
 *    carries no such thing, so the ladder is rebuilt from the games charter §4:
 *    demographic notoriety, in deciles, *inside the scoped pool* — which is why
 *    `QuizPeopleFixture` now carries `totalPopulation`.
 *
 * No per-people scope. None of the 621 peoples reaches eight distinct
 * questions (five at most), and scoping to a people's near pool — "this people
 * and its neighbours" — would build the hardest session the corpus can produce
 * with no ladder at all, which is the opposite of a track.
 */

/**
 * `country` and `family` narrow to one entity; `mixed` and `random` span the
 * corpus and differ only in whether the ladder is applied.
 */
export type QuizScopeKind = "country" | "family" | "mixed" | "random";

export interface QuizScope {
  kind: QuizScopeKind;
  /** ISO 3166-1 alpha-3 for `country`, `FLG_*` for `family`, absent otherwise. */
  entityId?: string;
}

/** Rounds per session (FR67). Eight, as the games charter's ladder is written for. */
// @req REQ-103
export const QUIZ_SESSION_SIZE = 8;

/** The scope every visitor lands on: the whole corpus, ordered easiest first. */
// @req REQ-103
export const DEFAULT_QUIZ_SCOPE: QuizScope = { kind: "mixed" };

export type QuizDifficultyBand = "facile" | "moyen" | "difficile";

/**
 * The band of each round of a session, games charter §4: two easy, four
 * middling, two hard. Written out rather than computed so the shape of a
 * session is readable, and so changing it is one visible edit.
 */
// @req REQ-103
export const SESSION_BAND_PLAN: readonly QuizDifficultyBand[] = [
  "facile",
  "facile",
  "moyen",
  "moyen",
  "moyen",
  "moyen",
  "difficile",
  "difficile",
];

/**
 * The band plan for a session of `size`, keeping the charter's quarter-half-
 * quarter shape when the session is not eight rounds long.
 *
 * The API allows 5 to 10 questions, so slicing the eight-slot plan would have
 * given a five-round session two easy rounds, two middling and no hard one —
 * a ladder with its top step missing.
 */
// @req REQ-103
export function sessionBandPlan(
  size: number = QUIZ_SESSION_SIZE
): QuizDifficultyBand[] {
  if (size <= 0) return [];
  const edge = Math.max(1, Math.round(size / 4));
  const middle = Math.max(0, size - edge * 2);
  return [
    ...Array<QuizDifficultyBand>(edge).fill("facile"),
    ...Array<QuizDifficultyBand>(middle).fill("moyen"),
    ...Array<QuizDifficultyBand>(edge).fill("difficile"),
  ];
}

/** Top tenth of the scoped pool by population — the peoples a reader has heard of. */
const FACILE_QUANTILE = 0.1;
/** Bottom three tenths — the ones the atlas exists to introduce. */
const DIFFICILE_QUANTILE = 0.7;

export interface QuizLadderSubject {
  id: string;
  totalPopulation: number | null;
}

/**
 * Bands every subject of the scoped pool by its population decile *within that
 * pool*.
 *
 * Relative, never absolute: a people of 300 000 is a household name inside
 * Djibouti and an obscurity inside Nigeria, and a session is played inside one
 * scope at a time. A fiche with no population sorts last, which puts it in the
 * hard band — the honest place for a people the corpus can say least about.
 *
 * This is a proxy and is stated as one: population approximates familiarity for
 * a French-speaking audience and diaspora, imperfectly. It is recorded here so
 * an empirical success rate can replace it later without anyone having to
 * rediscover why population was ever used.
 */
// @req REQ-103
export function bandSubjectsByPopulation(
  subjects: QuizLadderSubject[]
): Map<string, QuizDifficultyBand> {
  const ranked = [...subjects].sort(
    (a, b) => (b.totalPopulation ?? -1) - (a.totalPopulation ?? -1)
  );
  const bands = new Map<string, QuizDifficultyBand>();

  ranked.forEach((subject, rank) => {
    const quantile = ranked.length > 1 ? rank / (ranked.length - 1) : 0;
    if (quantile <= FACILE_QUANTILE) {
      bands.set(subject.id, "facile");
    } else if (quantile >= DIFFICILE_QUANTILE) {
      bands.set(subject.id, "difficile");
    } else {
      bands.set(subject.id, "moyen");
    }
  });

  return bands;
}

export interface QuizLadderCandidate {
  id: string;
  entityId: string;
}

/**
 * Fills the eight slots of `SESSION_BAND_PLAN` from `candidates`, preferring a
 * subject the session has not used yet.
 *
 * Three fallbacks, in order, because a narrow scope cannot always pay: the
 * wanted band with an unused subject, then the wanted band whatever the
 * subject, then anything left. A session of eight over Djibouti's three peoples
 * repeats subjects — that is what the corpus holds, and returning five
 * questions instead would be a worse answer than an honest repetition.
 *
 * Deterministic given the input order, so the caller decides how random a
 * session is by how it shuffles beforehand. That is the whole difference
 * between the `mixed` and `random` scopes.
 */
// @req REQ-103
export function composeLadder<T extends QuizLadderCandidate>(
  candidates: T[],
  bandOf: ReadonlyMap<string, QuizDifficultyBand>,
  plan: readonly QuizDifficultyBand[] = SESSION_BAND_PLAN
): T[] {
  const remaining = [...candidates];
  const usedSubjects = new Set<string>();
  const session: T[] = [];

  const take = (index: number): T => {
    const [picked] = remaining.splice(index, 1);
    usedSubjects.add(picked.entityId);
    session.push(picked);
    return picked;
  };

  for (const band of plan) {
    if (remaining.length === 0) break;

    const fresh = remaining.findIndex(
      (candidate) =>
        bandOf.get(candidate.entityId) === band &&
        !usedSubjects.has(candidate.entityId)
    );
    if (fresh !== -1) {
      take(fresh);
      continue;
    }

    const sameBand = remaining.findIndex(
      (candidate) => bandOf.get(candidate.entityId) === band
    );
    take(sameBand !== -1 ? sameBand : 0);
  }

  return session;
}

/**
 * Reads a scope off the two query parameters the picker submits.
 *
 * `?pays=` arriving empty is not a country whose id is nothing — the games'
 * scope picker learned that first. A country and a family given together is
 * over-specification the bank cannot honour as one pool, so the country wins:
 * it is the narrower of the two and the one a reader picked most deliberately.
 */
// @req REQ-103
export function parseQuizScope(params: {
  pays?: string | null;
  famille?: string | null;
  mode?: string | null;
}): QuizScope {
  const countryId = params.pays?.trim();
  if (countryId) return { kind: "country", entityId: countryId };

  const familyId = params.famille?.trim();
  if (familyId) return { kind: "family", entityId: familyId };

  return params.mode?.trim() === "aleatoire"
    ? { kind: "random" }
    : DEFAULT_QUIZ_SCOPE;
}

/** The query string that reproduces `scope` — what the picker submits and the exit clears. */
// @req REQ-103
export function quizScopeSearchParams(scope: QuizScope): URLSearchParams {
  const params = new URLSearchParams();
  if (scope.kind === "country" && scope.entityId) {
    params.set("pays", scope.entityId);
  } else if (scope.kind === "family" && scope.entityId) {
    params.set("famille", scope.entityId);
  } else if (scope.kind === "random") {
    params.set("mode", "aleatoire");
  }
  return params;
}

/** Stable key for a scope — cache keys, storage keys, test names. */
// @req REQ-103
export function quizScopeKey(scope: QuizScope): string {
  return scope.entityId ? `${scope.kind}:${scope.entityId}` : scope.kind;
}
