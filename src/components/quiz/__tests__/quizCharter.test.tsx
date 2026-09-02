// @req REQ-103 — Charter contract for the quiz surface
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  bandSubjectsByPopulation,
  composeLadder,
  sessionBandPlan,
  QUIZ_SESSION_SIZE,
} from "@/lib/quiz/quizScope";
import {
  QUIZ_THEME_IDS,
  QUIZ_THEME_SPECIMENS_FR,
  TEMPLATE_FIELD_PATHS,
} from "@/lib/quiz/segmentPolicy";

/**
 * What the quiz owes the games charter (`docs/design/games-charter.md`), now
 * that a session is scoped by entity rather than by audience.
 *
 * Named *Charter* so `discoverCharterNamedTests()` enrols it with no manifest
 * edit. Like the other charter suites it reads source where the claim is about
 * how the code is written — which colours it may name, whether an option can be
 * smaller than a thumb — and exercises the module where the claim is about
 * behaviour.
 */

const QUIZ_DIR = join(process.cwd(), "src", "components", "quiz");

function quizComponentFiles(): string[] {
  return readdirSync(QUIZ_DIR)
    .filter(
      (file) =>
        file.endsWith(".tsx") &&
        !file.includes(".test.") &&
        !file.includes(".stories.")
    )
    .sort();
}

function readQuizSource(file: string): string {
  return readFileSync(join(QUIZ_DIR, file), "utf8");
}

/** Colour literals of every spelling. Colours belong in tokens, not in JSX. */
const RAW_HEX_OR_RGB = /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsl\(/;
const RAW_PALETTE_CLASS =
  /\b(?:bg|text|border|ring|fill|stroke)-(?:red|green|gray|grey|blue|yellow|indigo|purple|pink|orange|teal|slate|zinc|neutral|stone|amber|lime|emerald|cyan|sky|violet|fuchsia|rose)-[0-9]{2,3}\b/;
const EMOJI = /\p{Extended_Pictographic}/u;

describe("Quiz charter contract (REQ-103)", () => {
  const files = quizComponentFiles();

  // @req REQ-103
  it("has quiz components to check", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  describe.each(files)("%s", (file) => {
    // @req REQ-103
    it("contains no raw hex, rgb or hsl colour literal", () => {
      const offenders = readQuizSource(file)
        .split("\n")
        .filter((line) => RAW_HEX_OR_RGB.test(line));
      expect(offenders).toEqual([]);
    });

    // @req REQ-103
    it("names no raw Tailwind palette colour", () => {
      const offenders = readQuizSource(file)
        .split("\n")
        .filter((line) => RAW_PALETTE_CLASS.test(line));
      expect(offenders).toEqual([]);
    });

    // @req REQ-103
    it("carries no emoji in its copy", () => {
      const offenders = readQuizSource(file)
        .split("\n")
        .filter((line) => EMOJI.test(line));
      expect(offenders).toEqual([]);
    });
  });

  // Charter §9.2 — an option looks answerable, at least 44px per WCAG 2.5.8.
  // @req REQ-103
  it("gives every answer option and the exit a 44px minimum target", () => {
    // `QuizScopePicker.tsx` stood here until the picker became cards: its 88
    // targets are all one component now, so that is where the rule bites. The
    // list follows the target, not the file that used to draw it.
    for (const file of [
      "QuizQuestionCard.tsx",
      "QuizSessionExit.tsx",
      "QuizTrackCard.tsx",
    ]) {
      expect(readQuizSource(file)).toMatch(/min-h-11/);
    }
  });

  /**
   * A client component reached from a server one may only take serialisable
   * props. `QuizScopePicker` is a server component and `QuizScopeDeck` is
   * `"use client"`, so a builder handed across that boundary is not a type
   * error and not a test failure — it is a 500 on the whole route, and only a
   * production render shows it. This suite renders in happy-dom, where the
   * boundary does not exist, so the guard has to read the source.
   *
   * It caught nothing when written: it was added *after* two `(id) => string`
   * props took `/fr/jeux/quiz` down in CI. `AtlasGlobe` carries the same note
   * for the same reason.
   */
  // @req REQ-121
  it("gives the client deck no prop a server component cannot serialise", () => {
    const source = readQuizSource("QuizScopeDeck.tsx");
    const props = source.slice(
      source.indexOf("export interface QuizScopeDeckProps"),
      source.indexOf("export const QuizScopeDeck")
    );

    expect(props).not.toBe("");
    // Every declared prop, minus the doc comments around them.
    const declarations = props
      .split("\n")
      .filter((line) => /^\s{2}\w+\??:/.test(line));
    expect(declarations.length).toBeGreaterThan(0);
    for (const declaration of declarations) {
      expect(declaration).not.toMatch(/=>/);
    }
  });

  /**
   * A theme card offers a track by showing the question that track asks. A
   * theme with no specimen would fall back to a bare label — an `<option>` with
   * a border, which is the shape this surface was rebuilt to leave behind.
   */
  // @req REQ-121
  it("carries a specimen for every theme", () => {
    expect(Object.keys(QUIZ_THEME_SPECIMENS_FR).sort()).toEqual(
      [...QUIZ_THEME_IDS].sort()
    );
    for (const specimen of Object.values(QUIZ_THEME_SPECIMENS_FR)) {
      expect(specimen).toMatch(/ \?$/);
    }
  });

  // Charter §9.1 — everything fits above the fold at 430px, and when it cannot,
  // the stage shrinks; the options are never what gets pushed off.
  // @req REQ-103
  it("lays the answer options out in two columns rather than a single tall run", () => {
    const source = readQuizSource("QuizQuestionCard.tsx");
    expect(source).toMatch(/grid-cols-1/);
    expect(source).toMatch(/min-\[430px\]:grid-cols-2/);
  });

  // @req REQ-103
  it("offers a way out of a running session, not only of a finished one", () => {
    // A player who picks the wrong country would otherwise be held for eight
    // questions: no breadcrumb, no abandon, no link back.
    expect(readQuizSource("QuizPlayIsland.tsx")).toMatch(/QuizSessionExit/);
  });

  // Charter §4 — a session of 8 rounds ordered by ascending difficulty band.
  // @req REQ-103
  it("plans a session of eight as two easy, four middling and two hard", () => {
    const plan = sessionBandPlan(QUIZ_SESSION_SIZE);
    expect(plan).toHaveLength(QUIZ_SESSION_SIZE);
    expect(plan.filter((band) => band === "facile")).toHaveLength(2);
    expect(plan.filter((band) => band === "moyen")).toHaveLength(4);
    expect(plan.filter((band) => band === "difficile")).toHaveLength(2);
  });

  // @req REQ-103
  it("orders a real session from the best-known subject of the scope to the least", () => {
    const subjects = Array.from({ length: 30 }, (_, index) => ({
      id: `PPL_${index}`,
      totalPopulation: (30 - index) * 250_000,
    }));
    const bands = bandSubjectsByPopulation(subjects);
    const session = composeLadder(
      subjects.map((subject) => ({
        id: `q-${subject.id}`,
        entityId: subject.id,
      })),
      bands
    );

    const populationOf = (entityId: string) =>
      subjects.find((subject) => subject.id === entityId)!.totalPopulation;

    expect(session).toHaveLength(QUIZ_SESSION_SIZE);
    expect(populationOf(session[0].entityId)).toBeGreaterThan(
      populationOf(session[session.length - 1].entityId)
    );
  });
});

/**
 * Charter §8 — the register a stem is allowed to use.
 *
 * « Technical vocabulary belongs in the reveal, where it can be explained,
 * never in the stem, where it blocks. » T5 asked for a language's ISO 639-3
 * code, which is a registry identifier rather than a name: it can only be
 * recalled, never reasoned about, so it also failed the kill test. Asserting it
 * here rather than in a unit test means the next template reaching for a
 * standards code fails as a charter breach, which is what it is.
 */
describe("games charter §8 — no stem asks for a registry identifier", () => {
  // @req REQ-103
  it("reads no template off a field holding a standards code", () => {
    expect(Object.values(TEMPLATE_FIELD_PATHS)).not.toContain(
      "content.languages.isoCodes"
    );
  });

  // @req REQ-103
  it("names no standards registry in the stems it builds", () => {
    const templates = readFileSync(
      join(process.cwd(), "src", "lib", "quiz", "questionTemplates.ts"),
      "utf8"
    );

    expect(templates).not.toMatch(/ISO 639-3/);
  });
});
