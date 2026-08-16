/**
 * Zod schemas for `/v2/quiz/segments` and `/v2/quiz/session` (Epic 10,
 * Story 10.7, ETNI-496, FR66, AR8/AR9, NFR38).
 *
 * `count` bounds (5–10, default 8) and `difficulty` bounds (1–5, the
 * `quiz_questions.difficulty` DB constraint) are shape-level checks handled
 * here with 400 VALIDATION_ERROR. Whether a given `difficulty` rung is
 * actually offered by a `segment` is a business rule (`DIFFICULTY_RUNGES`,
 * ETNI-493) that needs both fields together — that check lives in the
 * handler and maps to 422 SEMANTIC_ERROR, not here.
 */

import { z } from "zod";
import { QUIZ_AUDIENCES, type QuizAudience } from "@/lib/quiz/segmentPolicy";

const QUIZ_AUDIENCE_TUPLE = QUIZ_AUDIENCES as [QuizAudience, ...QuizAudience[]];

export const quizAudienceSchema = z.enum(QUIZ_AUDIENCE_TUPLE);

export type QuizAudienceParam = z.infer<typeof quizAudienceSchema>;

export const MIN_QUIZ_SESSION_COUNT = 5;
export const MAX_QUIZ_SESSION_COUNT = 10;
export const DEFAULT_QUIZ_SESSION_COUNT = 8;

const COUNT_RANGE_MESSAGE = `count must be between ${MIN_QUIZ_SESSION_COUNT} and ${MAX_QUIZ_SESSION_COUNT}`;

// @req REQ-103
export const quizSessionQuerySchema = z.object({
  segment: quizAudienceSchema,
  difficulty: z.coerce
    .number({ message: "difficulty must be a number between 1 and 5" })
    .int()
    .min(1, { message: "difficulty must be between 1 and 5" })
    .max(5, { message: "difficulty must be between 1 and 5" }),
  count: z.coerce
    .number({ message: COUNT_RANGE_MESSAGE })
    .int()
    .min(MIN_QUIZ_SESSION_COUNT, { message: COUNT_RANGE_MESSAGE })
    .max(MAX_QUIZ_SESSION_COUNT, { message: COUNT_RANGE_MESSAGE })
    .default(DEFAULT_QUIZ_SESSION_COUNT),
});

export type QuizSessionQuery = z.infer<typeof quizSessionQuerySchema>;

export const quizSegmentRungSchema = z.object({
  difficulty: z.number().int(),
  activeQuestionCount: z.number().int().min(0),
});

export type QuizSegmentRung = z.infer<typeof quizSegmentRungSchema>;

export const quizSegmentSchema = z.object({
  id: quizAudienceSchema,
  labelFr: z.string(),
  rungs: z.array(quizSegmentRungSchema),
});

export type QuizSegmentView = z.infer<typeof quizSegmentSchema>;

export const quizSegmentsDataSchema = z.object({
  segments: z.array(quizSegmentSchema),
});

export type QuizSegmentsData = z.infer<typeof quizSegmentsDataSchema>;

export const quizSourceRefSchema = z.object({
  title: z.string(),
  year: z.number().int().nullable(),
  tier: z.string().nullable(),
  url: z.string().nullable(),
});

export type QuizSourceRefView = z.infer<typeof quizSourceRefSchema>;

export const quizEntityLinkSchema = z.object({
  type: z.literal("people"),
  id: z.string(),
  slug: z.string(),
  autonym: z.string().nullable(),
  exonym: z.string().nullable(),
});

export type QuizEntityLinkView = z.infer<typeof quizEntityLinkSchema>;

export const quizOptionValueSchema = z.union([
  z.string(),
  z.object({ autonym: z.string(), exonym: z.string().optional() }),
]);

export const quizSessionQuestionSchema = z.object({
  id: z.string(),
  templateId: z.enum(["T1", "T2", "T3", "T4", "T5"]),
  promptFr: z.string(),
  optionsFr: z.array(quizOptionValueSchema),
  correctOption: z.number().int().min(0).max(3),
  explanationFr: z.string(),
  source: quizSourceRefSchema,
  assertionId: z.string(),
  entity: quizEntityLinkSchema,
});

export type QuizSessionQuestionView = z.infer<typeof quizSessionQuestionSchema>;

export const quizSessionDataSchema = z.object({
  segment: quizAudienceSchema,
  difficulty: z.number().int(),
  questions: z.array(quizSessionQuestionSchema),
});

export type QuizSessionData = z.infer<typeof quizSessionDataSchema>;
