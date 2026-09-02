import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  NOMMER_FIGURES,
  PEJORATIVE_STEMS,
} from "@/lib/dossiers/nommer/figures";

/**
 * The figures suite replays the counts instead of restating them.
 *
 * A dossier arguing from numbers has one failure mode worth guarding: the
 * corpus moves, the sentence does not, and the page goes on asserting a count
 * nobody can reproduce. Reading the fiches here is the only version of this
 * test that can fail for the reason its name gives — an assertion that
 * `value === 3207` would pass forever, including on the day it became false.
 */

const CORPUS_ROOT = resolve(process.cwd(), "dataset/source/afrik");

const foldAccents = (value: string | null | undefined): string =>
  (value ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

interface PeopleFiche {
  classificationStatus?: string;
  content?: {
    appellations?: {
      selfAppellation?: string;
      exonyms?: string[];
      originOfExonyms?: string;
      whyProblematic?: string;
    };
  };
}

function readPeopleFiches(): PeopleFiche[] {
  const peoplesRoot = join(CORPUS_ROOT, "peuples");
  const fiches: PeopleFiche[] = [];

  for (const branch of readdirSync(peoplesRoot)) {
    const branchPath = join(peoplesRoot, branch);
    if (!statSync(branchPath).isDirectory()) continue;
    for (const file of readdirSync(branchPath)) {
      if (!file.endsWith(".json")) continue;
      fiches.push(JSON.parse(readFileSync(join(branchPath, file), "utf8")));
    }
  }

  return fiches;
}

/** The probe the dossier publishes: word stems over the two prose fields. */
function probeCount(fiches: PeopleFiche[], stems: readonly string[]): number {
  return fiches.filter((fiche) => {
    const appellations = fiche.content?.appellations ?? {};
    const blob = `${foldAccents(appellations.originOfExonyms)} ${foldAccents(
      appellations.whyProblematic
    )}`;
    return stems.some((stem) => blob.includes(stem));
  }).length;
}

function countedValue(figureKey: string): number {
  const figure = NOMMER_FIGURES[figureKey];
  expect(figure, `figure ${figureKey} is declared`).toBeDefined();
  expect(figure.kind, `figure ${figureKey} is counted`).toBe("counted");
  return (figure as { value: number }).value;
}

describe("the Nommer dossier's figures", () => {
  // @req REQ-113
  it("still counts what it says it counts, on today's corpus", () => {
    const fiches = readPeopleFiches();

    expect(fiches.length).toBe(countedValue("corpus-peoples"));

    const exonyms = fiches.reduce(
      (total, fiche) =>
        total + (fiche.content?.appellations?.exonyms ?? []).length,
      0
    );
    expect(exonyms).toBe(countedValue("corpus-exonyms"));

    const autonyms = fiches.filter((fiche) =>
      (fiche.content?.appellations?.selfAppellation ?? "").trim()
    ).length;
    expect(autonyms).toBe(countedValue("corpus-autonyms"));
  });

  // The three numbers that replace a percentage. Guarded together, because
  // publishing any one of them without the other two is the misreading the
  // dossier exists to avoid.
  // @req REQ-113
  it("keeps the three classification numbers adding up to the corpus", () => {
    const fiches = readPeopleFiches();

    const contestedOrColonial = fiches.filter(
      (fiche) =>
        fiche.classificationStatus === "contested" ||
        fiche.classificationStatus === "colonial-legacy"
    ).length;
    const other = fiches.filter(
      (fiche) =>
        fiche.classificationStatus &&
        fiche.classificationStatus !== "contested" &&
        fiche.classificationStatus !== "colonial-legacy"
    ).length;
    const undeclared = fiches.filter(
      (fiche) => !fiche.classificationStatus
    ).length;

    expect(contestedOrColonial).toBe(
      countedValue("status-contested-or-colonial")
    );
    expect(other).toBe(countedValue("status-other"));
    expect(undeclared).toBe(countedValue("status-undeclared"));
    expect(contestedOrColonial + other + undeclared).toBe(fiches.length);
  });

  // @req REQ-113
  it("reproduces every lexical probe from its published stems", () => {
    const fiches = readPeopleFiches();
    const singleStemProbes: Array<[string, string]> = [
      ["probe-colonial", "colonial"],
      ["probe-administration", "administr"],
      ["probe-european", "europ"],
      ["probe-neighbours", "voisin"],
      ["probe-portuguese", "portugais"],
      ["probe-arabic", "arab"],
      ["probe-swahili", "swahili"],
      ["probe-slavery", "esclav"],
      ["probe-missionary", "missionn"],
    ];

    for (const [figureKey, stem] of singleStemProbes) {
      expect(probeCount(fiches, [stem]), figureKey).toBe(
        countedValue(figureKey)
      );
    }

    expect(probeCount(fiches, PEJORATIVE_STEMS)).toBe(
      countedValue("probe-pejorative")
    );
  });

  // @req REQ-113
  it("counts the countries, the name fiches and the language families", () => {
    const countries = readdirSync(join(CORPUS_ROOT, "pays")).filter((file) =>
      file.endsWith(".json")
    );
    expect(countries.length).toBe(countedValue("corpus-countries"));

    const families = readdirSync(
      join(CORPUS_ROOT, "famille_linguistique")
    ).filter((file) => file.startsWith("FLG_") && file.endsWith(".json"));
    expect(families.length).toBe(countedValue("corpus-language-families"));

    const patronymes = readdirSync(join(CORPUS_ROOT, "patronymes"))
      .filter((file) => file.startsWith("PAT_") && file.endsWith(".json"))
      .map(
        (file) =>
          JSON.parse(
            readFileSync(join(CORPUS_ROOT, "patronymes", file), "utf8")
          ) as { nameSystem?: string; transmissionMode?: string }
      )
      .filter((fiche) => Boolean(fiche.nameSystem));

    expect(patronymes.length).toBe(countedValue("patronyme-fiches"));
    expect(
      patronymes.filter((fiche) => fiche.transmissionMode === "non_hereditary")
        .length
    ).toBe(countedValue("patronyme-non-hereditary"));
  });

  // A hand reading cannot be verified. It can be required to say so — which
  // is the whole point of separating `read` from `counted`.
  // @req REQ-113
  it("makes every hand-read figure publish its caveat and its method", () => {
    for (const figure of Object.values(NOMMER_FIGURES)) {
      if (figure.kind !== "read") continue;
      expect(figure.caveat, figure.figureKey).not.toBe("");
      expect(figure.method, figure.figureKey).not.toBe("");
      expect(Number.isNaN(Date.parse(figure.readOn)), figure.figureKey).toBe(
        false
      );
    }
  });

  // @req REQ-113
  it("makes every missing figure explain what the corpus cannot say", () => {
    const missing = Object.values(NOMMER_FIGURES).filter(
      (figure) => figure.kind === "missing"
    );
    expect(missing.length).toBeGreaterThan(0);
    for (const figure of missing) {
      expect(figure.kind === "missing" && figure.reason).not.toBe("");
    }
  });

  // @req REQ-113
  it("keys every figure by its own key", () => {
    for (const [key, figure] of Object.entries(NOMMER_FIGURES)) {
      expect(figure.figureKey).toBe(key);
      expect(figure.label).not.toBe("");
    }
  });
});
