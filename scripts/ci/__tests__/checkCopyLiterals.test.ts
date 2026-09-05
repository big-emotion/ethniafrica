import { describe, expect, it } from "vitest";

import {
  checkCopyLiterals,
  findCopyLiterals,
  isGuardedPath,
  resolveGuardMode,
} from "../checkCopyLiterals";

const COMPONENT = "src/components/people/PeopleFicheHead.tsx";

/**
 * The guard exists so the next French string lands in a dictionary and not
 * in a component. It is narrow on purpose: an accented character inside a
 * literal a reader could see, nothing more — a rule that fired on every
 * `é` in a comment or a fixture would be switched off within a week.
 */
describe("copy-literal guard — what counts as reader-facing French", () => {
  // @req REQ-145
  it("flags JSX text, attribute strings and template parts, with their position", () => {
    const source = [
      `export function Head({ n }: { n: number }) {`,
      `  return (`,
      `    <section aria-label="Répartition par pays">`,
      `      <p>Aucun résultat</p>`,
      `      <span>{\`\${n} peuples documentés\`}</span>`,
      `    </section>`,
      `  );`,
      `}`,
    ].join("\n");

    const findings = findCopyLiterals(source, COMPONENT);

    expect(findings.map((finding) => finding.text)).toEqual([
      "Répartition par pays",
      "Aucun résultat",
      "peuples documentés",
    ]);
    expect(findings[0]).toMatchObject({ path: COMPONENT, line: 3, column: 25 });
    expect(findings[1]).toMatchObject({ line: 4 });
  });

  // Comments narrate for a maintainer, not for a reader, and half the doc
  // blocks in this repository quote the French label they explain.
  // @req REQ-145
  it("ignores accents in line, block and JSX comments", () => {
    const source = [
      `// Prints « Aucun résultat » when the corpus is empty.`,
      `/** The label reads « Répartition ». */`,
      `export function Head() {`,
      `  return <p>{/* « Déjà » */}Nothing</p>;`,
      `}`,
    ].join("\n");

    expect(findCopyLiterals(source, COMPONENT)).toEqual([]);
  });

  // @req REQ-145
  it("leaves an unaccented literal alone", () => {
    const source = `export const label = "Fermer";\n`;
    expect(findCopyLiterals(source, COMPONENT)).toEqual([]);
  });
});

describe("copy-literal guard — which files it reads", () => {
  // @req REQ-145
  it("guards source under src/ and nothing else", () => {
    expect(isGuardedPath(COMPONENT)).toBe(true);
    expect(isGuardedPath("src/app/[lang]/atlas/pays/page.tsx")).toBe(true);
    expect(isGuardedPath("scripts/ci/checkCopyLiterals.ts")).toBe(false);
    expect(isGuardedPath("e2e/home.spec.ts")).toBe(false);
    expect(isGuardedPath("src/styles/tokens/colors.css")).toBe(false);
    expect(isGuardedPath("src/types/next.d.ts")).toBe(false);
  });

  // The dictionaries are where the French is supposed to be; the tests and
  // stories assert it; the code-authored banks — facts, dossiers, legal
  // pages, games, glossary, doctrine, mail — are editorial prose whose
  // migration is its own wave, and the atlas assets are generated data.
  // @req REQ-145
  it("exempts the dictionaries, the tests, the stories and the code-authored banks", () => {
    for (const exempt of [
      "src/lib/i18n/copy/quiz.ts",
      "src/lib/translations.ts",
      "src/components/people/__tests__/PeopleFicheHead.test.tsx",
      "src/components/people/PeopleFicheHead.test.tsx",
      "src/components/people/PeopleFicheHead.stories.tsx",
      "src/components/people/__fixtures__/yoruba.ts",
      "src/test/mockRouteLanguage.ts",
      "src/stories/Introduction.tsx",
      "src/lib/home/didYouKnowFacts.ts",
      "src/lib/dossiers/nommer/chapters/lePeuple.ts",
      "src/lib/legal-pages.ts",
      "src/lib/legal-pages-en.ts",
      "src/lib/games/scaleFacts.ts",
      "src/lib/glossaire/entries.ts",
      "src/lib/doctrine/formatVersionLabel.ts",
      "src/lib/email/contactMessage.ts",
      "src/lib/atlas/assets/africaAdmin0.ts",
    ]) {
      expect(isGuardedPath(exempt), exempt).toBe(false);
    }
  });
});

describe("copy-literal guard — new literals only", () => {
  // The tree carries some two thousand French literals predating the rule.
  // A file that holds one is still editable: the gate reads what the change
  // adds, so a wave can migrate a directory one string at a time.
  // @req REQ-145
  it("reports only the literals the change introduced", () => {
    const previous = `export const a = "Déjà là";\n`;
    const current = [
      `export const a = "Déjà là";`,
      `export const b = "Nouvelle chaîne";`,
    ].join("\n");

    const findings = checkCopyLiterals(current, COMPONENT, previous);

    expect(findings.map((finding) => finding.text)).toEqual([
      "Nouvelle chaîne",
    ]);
  });

  // @req REQ-145
  it("reports everything in a file the change created", () => {
    const current = `export const a = "Déjà là";\n`;
    expect(checkCopyLiterals(current, COMPONENT, undefined)).toHaveLength(1);
  });
});

describe("copy-literal guard — modes", () => {
  // @req REQ-145
  it("surveys without blocking unless a diff base is given", () => {
    expect(resolveGuardMode([])).toEqual({ diffBase: undefined, survey: true });
    expect(resolveGuardMode(["--all"])).toEqual({
      diffBase: undefined,
      survey: true,
    });
  });

  // lint-staged appends the staged paths after the flag; CI names the base
  // branch. Both must be diff-scoped, or the gate could only ever survey.
  // @req REQ-145
  it("blocks on the staged files or on the diff against a base", () => {
    expect(resolveGuardMode(["--staged", "src/a.tsx", "src/b.ts"])).toEqual({
      diffBase: "HEAD",
      survey: false,
    });
    expect(resolveGuardMode(["--base", "origin/recette"])).toEqual({
      diffBase: "origin/recette",
      survey: false,
    });
  });

  // @req REQ-145
  it("refuses a base flag with no ref rather than surveying by accident", () => {
    expect(() => resolveGuardMode(["--base"])).toThrow(/--base requires/);
  });
});
