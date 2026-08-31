import { z } from "zod";

/**
 * Round shapes crossing the server→client boundary for the Jouer games
 * (REQ-120).
 *
 * There is no public `/api/v2/games/*` route, so these schemas do not police
 * an HTTP contract. They police something else: rounds are computed in a
 * server component and serialised into a client island, and a malformed round
 * there would surface as a blank game rather than an error. Parsing at that
 * seam turns a silent blank into a loud failure.
 */

const gameRevealSchema = z.object({
  textFr: z.string().min(1),
  fieldPath: z.string().min(1),
});

const gameOptionSchema = z.object({
  labelFr: z.string().min(1),
  name: z
    .object({ autonym: z.string(), exonym: z.string().optional() })
    .optional(),
});

const lonLatSchema = z.object({ lon: z.number(), lat: z.number() });

const gameAreaShapeSchema = z.object({
  labelFr: z.string().min(1),
  rings: z.array(z.array(lonLatSchema)),
  areaKm2: z.number().nonnegative(),
  captionFr: z.string().optional(),
});

const roundBaseShape = {
  gameId: z.string().min(1),
  subjectId: z.string().min(1),
  promptFr: z.string().min(1),
  reveal: gameRevealSchema,
};

// @req REQ-120
export const binaryRoundSchema = z.object({
  ...roundBaseShape,
  kind: z.literal("binary"),
  options: z.tuple([gameOptionSchema, gameOptionSchema]),
  correctIndex: z.union([z.literal(0), z.literal(1)]),
});

// @req REQ-120
export const quadRoundSchema = z.object({
  ...roundBaseShape,
  kind: z.literal("quad"),
  options: z.tuple([
    gameOptionSchema,
    gameOptionSchema,
    gameOptionSchema,
    gameOptionSchema,
  ]),
  correctIndex: z.number().int().min(0).max(3),
});

// @req REQ-120
export const globeTapRoundSchema = z.object({
  ...roundBaseShape,
  kind: z.literal("globeTap"),
  // Four choices, because a target the reader cannot see is not a choice.
  choices: z.array(z.string()).min(2),
  correctCountryId: z.string().min(1),
});

// @req REQ-120
export const areaCompareRoundSchema = z.object({
  ...roundBaseShape,
  kind: z.literal("areaCompare"),
  shapes: z.tuple([gameAreaShapeSchema, gameAreaShapeSchema]),
  correctIndex: z.union([z.literal(0), z.literal(1)]),
  questionFr: z.string().min(1),
});

// @req REQ-120
export const gameRoundSchema = z.discriminatedUnion("kind", [
  binaryRoundSchema,
  quadRoundSchema,
  globeTapRoundSchema,
  areaCompareRoundSchema,
]);

// @req REQ-120
export const gameRoundsDataSchema = z.object({
  rounds: z.array(gameRoundSchema),
  corpusLimited: z.boolean(),
});

export type GameRoundsPayload = z.infer<typeof gameRoundsDataSchema>;
