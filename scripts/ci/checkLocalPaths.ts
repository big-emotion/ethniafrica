/**
 * Refuse any local filesystem path in the public repository.
 *
 *   npx tsx scripts/ci/checkLocalPaths.ts            every tracked file
 *   npx tsx scripts/ci/checkLocalPaths.ts --staged   what is about to be committed
 *
 * This repository is public. A path like `/Users/<name>/Documents/...` names the
 * author's machine and the private production workspace next to it, in a file
 * anyone can read. Two such leaks were already committed before this gate
 * existed: a memory path in one skill, and a whole shelf listing in another.
 *
 * Server paths are not local paths. Production's Supabase stack genuinely lives
 * at `/home/ubuntu/supabase/docker` on the VPS and the runbooks have to say so,
 * so that one prefix is allowed by name. CI runner paths under `~/.ssh` and
 * `~/.cache` are the same case.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";

type Pattern = { name: string; re: RegExp; hint: string };

const PATTERNS: Pattern[] = [
  {
    name: "chemin absolu macOS",
    re: /\/Users\//,
    hint: "nomme la machine de l'auteur — écris un chemin relatif au dépôt",
  },
  {
    // Anchored to the start of a path token. Unanchored, it matched every
    // `src/lib/home/…` import in the codebase and buried the real leaks.
    name: "chemin absolu Linux",
    re: /(?:^|[\s"'`(=[])\/home\/(?!ubuntu\b)[a-z]/,
    hint: "seul /home/ubuntu (le VPS de production) est un chemin serveur légitime",
  },
  {
    name: "raccourci maison",
    re: /(?:^|[^\w.])~\/(?!\.ssh\b|\.cache\b)/,
    hint: "~/ désigne la machine de l'auteur — sauf ~/.ssh et ~/.cache sur un runner",
  },
  {
    name: "arborescence d'atelier",
    re: /\b04-Atelier\b/,
    hint: "l'atelier est privé et son arborescence ne se documente pas ici",
  },
  {
    name: "espace de travail privé",
    re: /\bBIG_EMOTION\b/,
    hint: "nomme l'espace de travail privé de l'auteur",
  },
  {
    name: "arborescence de dépôt local",
    re: /\bDocuments\/Dev\b/,
    hint: "nomme la copie de travail locale",
  },
];

/** Binaries and lockfiles: a byte sequence is not a leak, and noise hides real ones. */
const SKIP =
  /(^|\/)(package-lock\.json|node_modules\/)|\.(png|jpe?g|gif|webp|ico|pdf|mp4|mov|woff2?|ttf|otf|zip|tgz)$/i;

/** This file necessarily quotes the patterns it forbids. */
const SELF = "scripts/ci/checkLocalPaths.ts";

function trackedFiles(stagedOnly: boolean): string[] {
  const args = stagedOnly
    ? ["diff", "--cached", "--name-only", "--diff-filter=ACMR"]
    : ["ls-files"];
  return execFileSync("git", args, { encoding: "utf8" })
    .split("\n")
    .filter((f) => f && !SKIP.test(f) && f !== SELF);
}

/** Lines that must trip the gate, and lines that must not. */
const FIXTURES: Array<[string, boolean]> = [
  ["read `/Users/someone/.claude/projects/x/memory.md`", true],
  ["see `04-Atelier/Guides/prompts.md` § 12", true],
  ["under ~/Documents/BIG_EMOTION/06-Projets", true],
  ["cd Documents/Dev/ethniafrica && npm ci", true],
  ["ssh to /home/deploy/app", true],
  // The false positives that made the first version of this gate unusable:
  // every `src/lib/home/…` import in the codebase matched an unanchored
  // `/home/` pattern, and 84 files of noise hid the three real leaks.
  ['import { X } from "@/lib/home/didYouKnowFacts";', false],
  ['src: "/images/home/al-idrisi-1154.jpg",', false],
  ["SUPABASE_STACK_DIR: /home/ubuntu/supabase/docker", false],
  ["printf '%s\\n' \"$SSH_KEY\" > ~/.ssh/deploy_key", false],
  ["path: ~/.cache/ms-playwright", false],
];

function selftest(): number {
  const failures: string[] = [];
  for (const [line, shouldTrip] of FIXTURES) {
    const tripped = PATTERNS.some((p) => p.re.test(line));
    if (tripped !== shouldTrip) {
      failures.push(
        `  ${shouldTrip ? "aurait dû déclencher" : "n'aurait pas dû déclencher"} : ${line}`
      );
    }
  }
  if (failures.length) {
    console.error(
      `✖ ${failures.length} cas sur ${FIXTURES.length} :\n${failures.join("\n")}`
    );
    return 1;
  }
  console.log(`✔ ${FIXTURES.length} cas de contrôle passent`);
  return 0;
}

function main(): number {
  if (process.argv.includes("--selftest")) return selftest();
  const stagedOnly = process.argv.includes("--staged");
  const offences: string[] = [];

  for (const file of trackedFiles(stagedOnly)) {
    let content: string;
    try {
      if (statSync(file).size > 2_000_000) continue;
      content = readFileSync(file, "utf8");
    } catch {
      continue; // deleted, or not valid UTF-8
    }
    content.split("\n").forEach((line, i) => {
      for (const p of PATTERNS) {
        if (p.re.test(line)) {
          offences.push(
            `${file}:${i + 1}  ${p.name} — ${p.hint}\n    ${line.trim().slice(0, 140)}`
          );
        }
      }
    });
  }

  if (offences.length) {
    console.error(
      `\n✖ ${offences.length} chemin(s) local(aux) dans un dépôt public :\n\n` +
        offences.join("\n") +
        "\n\nUn chemin local publie la machine de l'auteur. Écris un chemin relatif au dépôt.\n"
    );
    return 1;
  }
  console.log(
    `✔ aucun chemin local (${stagedOnly ? "fichiers indexés" : "fichiers suivis"})`
  );
  return 0;
}

process.exit(main());
