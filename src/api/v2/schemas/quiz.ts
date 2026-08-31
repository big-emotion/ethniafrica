/**
 * Zod schemas for `/v2/quiz/scopes` and `/v2/quiz/session` (Epic 10,
 * Story 10.7, ETNI-496, FR66, AR8/AR9, NFR38).
 *
 * `count` bounds (5–10, default 8) and the *shape* of a scope's identifier are
 * checked here with 400 VALIDATION_ERROR. Whether the named country or family
 * actually holds enough questions to launch is a business rule that needs the
 * bank as well as the query — that check lives in the handler and maps to 422
 * SEMANTIC_ERROR, exactly where the retired segment/rung check used to sit.
 *
 * This endpoint pair used to be keyed by audience segment. Renaming
 * `/segments` to `/scopes` rather than redefining it in place is deliberate:
 * the same path returning a different kind of thing is the harder break to
 * notice.
 */

import { z } from "zod";

import { isQuizThemeId } from "@/lib/quiz/segmentPolicy";
import type { QuizScopeKind } from "@/lib/quiz/quizScope";

/** ISO 3166-1 alpha-3, as `afrik_countries.id` stores it. */
const COUNTRY_ID_PATTERN = /^[A-Za-z]{3}$/;
/** `FLG_*`, as `afrik_language_families.id` stores it. */
const FAMILY_ID_PATTERN = /^FLG_[A-Za-z0-9_]{1,40}$/;

// @req REQ-103
export const quizScopeKindSchema = z.enum([
  "country",
  "family",
  "mixed",
  "random",
]);

// @req REQ-103
export const MIN_QUIZ_SESSION_COUNT = 5;
// @req REQ-103
export const MAX_QUIZ_SESSION_COUNT = 10;
// @req REQ-103
export const DEFAULT_QUIZ_SESSION_COUNT = 8;

const COUNT_RANGE_MESSAGE = `count must be between ${MIN_QUIZ_SESSION_COUNT} and ${MAX_QUIZ_SESSION_COUNT}`;

/**
 * An absent parameter and one submitted empty mean the same thing: no filter.
 * `?pays=` arrives as an empty string from a `GET` form whose select is on
 * « Tous les pays », and reading that as a country whose id is nothing would
 * compose an empty session under a filter nobody set.
 */
const blankAsUndefined = z
  .string()
  .optional()
  .transform((value) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  });

// @req REQ-103
export const quizSessionQuerySchema = z.object({
  pays: blankAsUndefined.refine(
    (value) => value === undefined || COUNTRY_ID_PATTERN.test(value),
    { message: "pays must be an ISO 3166-1 alpha-3 country code" }
  ),
  famille: blankAsUndefined.refine(
    (value) => value === undefined || FAMILY_ID_PATTERN.test(value),
    { message: "famille must be a FLG_* language family id" }
  ),
  mode: blankAsUndefined.refine(
    (value) =>
      value === undefined || value === "mixte" || value === "aleatoire",
    { message: "mode must be mixte or aleatoire" }
  ),
  /**
   * A domain of content, composed with the track rather than replacing it —
   * `?pays=ZAF&theme=croyances` is the whole point of the facet, so this is not
   * a fifth `QuizScopeKind`.
   */
  theme: blankAsUndefined.refine(
    (value) => value === undefined || isQuizThemeId(value),
    { message: "theme must be one of the quiz content themes" }
  ),
  count: z.coerce
    .number({ message: COUNT_RANGE_MESSAGE })
    .int()
    .min(MIN_QUIZ_SESSION_COUNT, { message: COUNT_RANGE_MESSAGE })
    .max(MAX_QUIZ_SESSION_COUNT, { message: COUNT_RANGE_MESSAGE })
    .default(DEFAULT_QUIZ_SESSION_COUNT),
});

export type QuizSessionQuery = z.infer<typeof quizSessionQuerySchema>;

// @req REQ-103
export const quizScopeOptionSchema = z.object({
  id: z.string(),
  labelFr: z.string(),
  activeQuestionCount: z.number().int().min(0),
  /** False when the track exists in the corpus but cannot fill a session. */
  playable: z.boolean(),
});

// @req REQ-103
export const quizThemeOptionSchema = z.object({
  id: z.string(),
  labelFr: z.string(),
  activeQuestionCount: z.number().int().min(0),
  playable: z.boolean(),
});

export type QuizThemeOptionView = z.infer<typeof quizThemeOptionSchema>;

export type QuizScopeOptionView = z.infer<typeof quizScopeOptionSchema>;

// @req REQ-103
export const quizScopesDataSchema = z.object({
  countries: z.array(quizScopeOptionSchema),
  families: z.array(quizScopeOptionSchema),
  themes: z.array(quizThemeOptionSchema),
  mixed: quizScopeOptionSchema,
  random: quizScopeOptionSchema,
});

export type QuizScopesData = z.infer<typeof quizScopesDataSchema>;

// @req REQ-103
export const quizScopeViewSchema = z.object({
  kind: quizScopeKindSchema,
  entityId: z.string().nullable(),
  labelFr: z.string(),
});

export type QuizScopeView = z.infer<typeof quizScopeViewSchema>;

// @req REQ-103
export const quizSourceRefSchema = z.object({
  title: z.string(),
  year: z.number().int().nullable(),
  tier: z.string().nullable(),
  url: z.string().nullable(),
});

export type QuizSourceRefView = z.infer<typeof quizSourceRefSchema>;

// @req REQ-103
export const quizEntityLinkSchema = z.object({
  type: z.enum(["people", "country"]),
  id: z.string(),
  slug: z.string(),
  autonym: z.string().nullable(),
  exonym: z.string().nullable(),
});

export type QuizEntityLinkView = z.infer<typeof quizEntityLinkSchema>;

// @req REQ-103
export const quizOptionValueSchema = z.union([
  z.string(),
  z.object({ autonym: z.string(), exonym: z.string().optional() }),
]);

export type QuizOptionValue = z.infer<typeof quizOptionValueSchema>;

// @req REQ-103
export const quizSessionQuestionSchema = z.object({
  id: z.string(),
  templateId: z.enum([
    "T1",
    "T2",
    "T3",
    "T4",
    "T5",
    "T6",
    "T7",
    "T8",
    "T9",
    "T10",
    "T11",
    "T12",
    "T13",
    "T14",
    "T15",
    "T16",
    "T17",
    "T18",
  ]),
  promptFr: z.string(),
  /**
   * Verbatim corpus text the round is set up with, on the templates whose
   * answer is the subject. Null everywhere else, so the card renders nothing
   * rather than an empty block.
   */
  stimulusFr: z.string().nullable(),
  optionsFr: z.array(quizOptionValueSchema),
  correctOption: z.number().int().min(0).max(3),
  explanationFr: z.string(),
  source: quizSourceRefSchema,
  assertionId: z.string(),
  entity: quizEntityLinkSchema,
});

export type QuizSessionQuestionView = z.infer<typeof quizSessionQuestionSchema>;

// @req REQ-103
export const quizSessionDataSchema = z.object({
  scope: quizScopeViewSchema,
  questions: z.array(quizSessionQuestionSchema),
});

export type QuizSessionData = z.infer<typeof quizSessionDataSchema>;

export type { QuizScopeKind };
