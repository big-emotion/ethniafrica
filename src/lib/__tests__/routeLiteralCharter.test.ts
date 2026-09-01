import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { RELOCATED_SEGMENTS } from "@/middleware";

/**
 * No module URL is written out anywhere but the three places that own one.
 *
 * This is the assertion that decides whether Lot 3 is the last URL migration
 * or the first of several. Moving the routes cost almost nothing where a call
 * site went through `getLocalizedRoute` and its siblings — one slug table
 * changed and every one of those followed. It cost a day's work everywhere a
 * path had been typed out instead, and the typing had spread to some two
 * hundred and fifty places without anyone deciding it should. Nothing about
 * the migration removes the incentive to type the next one out; only a gate
 * does.
 *
 * Three files are exempt, and each for a reason that does not generalise:
 *
 *   · `routing.ts` — the slug table. Somewhere has to say `pays`.
 *   · `middleware.ts` — the redirect tables are keyed by the *retired*
 *     segments, which by definition no helper composes any more.
 *   · the suites that exist to pin those two, which cannot check a string is
 *     right without naming it.
 *
 * `.lighthouserc.js` is not scanned: it is CommonJS loaded by the Lighthouse
 * CLI, outside the TS path aliases, so it cannot import the slug table at
 * all. It is kept honest instead by `qualityGateRoutes.test.ts`, which reads
 * its URL list and compares it against helper-composed routes.
 *
 * Comments do not count, and the asymmetry is deliberate. What this gate is
 * defending is the cost of the *next* move: a hardcoded href silently sends a
 * reader to a 404, while a stale comment misleads a maintainer who is already
 * reading the code around it. The second is worth fixing and is not worth a
 * build failure — and naming a route is how half the doc blocks in this
 * repository explain what a file is for.
 */

const ROOT = resolve(__dirname, "../../..");

/**
 * The retired segments, plus the three verbs the modules now nest under.
 *
 * Read off the redirect table rather than restated: those are exactly the
 * first segments that used to address a module, so the table cannot grow an
 * entry this gate does not then police. The hubs are added because
 * `/fr/explorer/pays` is as hardcoded as `/fr/pays` was — writing out the
 * post-migration form is the same mistake, one migration later.
 */
const AXIS_SEGMENTS = [
  "explorer",
  "comprendre",
  "jouer",
  "atlas",
  "dossiers",
  "jeux",
];
const FORBIDDEN = [...Object.keys(RELOCATED_SEGMENTS), ...AXIS_SEGMENTS];

const EXEMPT = new Set([
  // The two owners.
  "src/lib/routing.ts",
  "src/middleware.ts",
  // The three suites that pin what those two answer. A test asserting
  // `getLocalizedRoute("fr", "countries") === getLocalizedRoute("fr",
  // "countries")` asserts nothing; somewhere the expected string has to be
  // written down, and these are the files where writing it down is the point.
  "src/lib/__tests__/routing.test.ts",
  "src/lib/hubs/__tests__/axisRoutes.test.ts",
  "src/__tests__/middleware.test.ts",
  // The redirect suite feeds in retired addresses on purpose: no helper
  // composes `/fr/ethnies` any more, which is exactly why it needs a redirect.
  "src/__tests__/redirectCharter.test.ts",
  "src/lib/__tests__/routeLiteralCharter.test.ts",
]);

// `/fr/<segment>` where the segment ends — a longer word merely starting with
// one of them (`/fr/paysages`) is a different route and none of our business.
const LITERAL = new RegExp(`/fr/(${FORBIDDEN.join("|")})(?![\\w-])`);

/**
 * The line with its comments removed, or empty when the whole line is one.
 *
 * Deliberately textual rather than a parse: it only has to be right about
 * which half of a line is code, and being wrong here can only ever let a
 * literal through, never fail a build over prose.
 */
function code(line: string): string {
  const trimmed = line.trim();
  if (trimmed.startsWith("*") || trimmed.startsWith("/*")) return "";
  return line.replace(/\/\/.*$/, "").replace(/\/\*.*?\*\//g, "");
}

function walk(directory: string, found: string[] = []): string[] {
  for (const entry of readdirSync(resolve(ROOT, directory), {
    withFileTypes: true,
  })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(path, found);
    } else if (/\.tsx?$/.test(entry.name)) {
      found.push(path);
    }
  }
  return found;
}

function sourceFiles(): string[] {
  return ["src", "scripts", "e2e"]
    .flatMap((directory) => walk(directory))
    .filter((file) => !EXEMPT.has(file))
    .sort();
}

describe("module URLs are composed, never written out", () => {
  // @req REQ-091
  it("finds no hardcoded module path outside the files that own one", () => {
    const offenders: string[] = [];

    for (const file of sourceFiles()) {
      const lines = readFileSync(resolve(ROOT, file), "utf8").split("\n");
      lines.forEach((line, index) => {
        if (LITERAL.test(code(line))) {
          offenders.push(`${file}:${index + 1}  ${line.trim()}`);
        }
      });
    }

    expect(
      offenders,
      `Compose these from the slug table instead — getLocalizedRoute, ` +
        `getCountryRoute, getPeopleRoute, getFamilyRoute:\n${offenders.join("\n")}`
    ).toEqual([]);
  });

  // The gate is worth exactly what its pattern catches, and a pattern that
  // matched nothing would pass this suite in silence for as long as it took
  // someone to notice.
  // @req REQ-091
  it("catches the shape it exists to catch, before and after the move", () => {
    expect(LITERAL.test(code('href="/fr/peuples/PPL_YORUBA"'))).toBe(true);
    expect(LITERAL.test(code('href="/fr/explorer/peuples/PPL_YORUBA"'))).toBe(
      true
    );
    // ETNI-1615: the verb prefix retired, the noun prefix it retired into.
    expect(LITERAL.test(code('href="/fr/atlas/peuples/PPL_YORUBA"'))).toBe(
      true
    );
  });

  // @req REQ-091
  it("reads past prose to the code on the line, and no further", () => {
    expect(LITERAL.test(code("// see /fr/comprendre/migrations"))).toBe(false);
    expect(LITERAL.test(code(" * lives at /fr/explorer/peuples"))).toBe(false);
    expect(
      LITERAL.test(code('const href = "/fr/peuples"; // the directory'))
    ).toBe(true);
  });

  // @req REQ-091
  it("leaves alone the routes no axis owns", () => {
    expect(LITERAL.test('"/fr/comparer"')).toBe(false);
    expect(LITERAL.test('"/fr/mentions-legales"')).toBe(false);
    expect(LITERAL.test('"/fr/admin/connexion"')).toBe(false);
    expect(LITERAL.test('"/fr"')).toBe(false);
  });

  // @req REQ-091
  it("does not mistake a longer word for a module segment", () => {
    expect(LITERAL.test('"/fr/paysages"')).toBe(false);
    expect(LITERAL.test('"/fr/explorer-le-corpus"')).toBe(false);
  });

  // A file list that silently emptied would make the sweep above vacuous.
  // @req REQ-091
  it("actually sweeps the source tree", () => {
    expect(sourceFiles().length).toBeGreaterThan(400);
  });
});
