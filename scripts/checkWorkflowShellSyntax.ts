#!/usr/bin/env tsx

/**
 * A `run:` block is shell source that no gate ever parsed. A quoting mistake in
 * one is invisible to YAML — the file loads, the workflow starts, and bash dies
 * on the first line of the step with `exit 2`, before the step does any work.
 * That is how `${VAR:?... project's key}` shipped: inside `${VAR:?word}` bash
 * re-reads the quoting of `word` even within double quotes, so the apostrophe
 * opened a string that was never closed.
 *
 * The check is `bash -n` on every run block — the same parser the runner uses.
 */

import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

/** Shells `bash -n` can speak for. Anything else (pwsh, python) is skipped. */
const BASH_COMPATIBLE_SHELLS = new Set(["bash", "sh", "bash -e {0}"]);

const RUN_KEY = /^(\s*)(?:-\s+)?run:(.*)$/;
const SHELL_KEY = /^(\s*)(?:-\s+)?shell:\s*(.+?)\s*$/;
const SEQUENCE_ITEM = /^\s*-\s/;
const BLOCK_SCALAR = /^([|>])([-+]?)\d*$/;

/**
 * A GitHub expression is substituted by the runner before bash sees the script,
 * so parsing it as shell would flag syntax that never reaches a shell. Replace
 * each one with a bare word — what a benign value expands to.
 */
const GITHUB_EXPRESSION = /\$\{\{[\s\S]*?\}\}/g;

export interface RunScript {
  /** 1-indexed line of the `run:` key, for an error a reader can jump to. */
  line: number;
  script: string;
}

function indentOf(line: string): number {
  return line.length - line.trimStart().length;
}

/** YAML folding: single newlines become spaces, blank lines stay newlines. */
function fold(lines: string[]): string {
  return lines
    .join("\n")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.split("\n").join(" "))
    .join("\n");
}

function stripQuotes(scalar: string): string {
  const quoted = scalar.match(/^"(.*)"$/) ?? scalar.match(/^'(.*)'$/);
  return quoted ? quoted[1] : scalar;
}

interface StepContext {
  /** The key this `run:` is nested under — `with:` means it is an input. */
  parentKey: string | null;
  /** The step's declared `shell:`, when one precedes the `run:`. */
  shell: string | null;
}

/**
 * One backward walk answers both questions a `run:` key raises. The `shell:` is
 * looked up backwards only: every declaration in this repository precedes its
 * `run:`, which is also the conventional ordering, and a trailing one would be
 * checked as bash — a loud failure rather than a silent skip.
 */
function contextOf(
  lines: string[],
  runIndex: number,
  keyIndent: number
): StepContext {
  let shell: string | null = null;

  for (let index = runIndex - 1; index >= 0; index -= 1) {
    const line = lines[index];
    if (line.trim() === "") continue;

    const indent = indentOf(line);
    if (indent < keyIndent) {
      const parent = line.match(/^\s*(?:-\s+)?([A-Za-z_][\w-]*):/);
      return { parentKey: parent ? parent[1] : null, shell };
    }
    if (indent > keyIndent) continue;

    const declared = line.match(SHELL_KEY);
    if (declared && !shell) shell = declared[2];
    // A sequence dash at this indent starts the step, so nothing above it belongs to it.
    if (SEQUENCE_ITEM.test(line)) return { parentKey: null, shell };
  }

  return { parentKey: null, shell };
}

export function extractRunScripts(content: string): RunScript[] {
  const lines = content.split("\n");
  const scripts: RunScript[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const key = lines[index].match(RUN_KEY);
    if (!key) continue;

    const keyIndent = lines[index].indexOf("run:");
    const { parentKey, shell } = contextOf(lines, index, keyIndent);

    // `run:` nested under `with:` is an input an action happens to have named
    // `run`, not a shell script — parsing it as bash invents a finding.
    if (parentKey === "with") continue;
    if (shell && !BASH_COMPATIBLE_SHELLS.has(shell)) continue;

    const remainder = key[2].trim();
    const blockStyle = remainder.match(BLOCK_SCALAR);
    if (!blockStyle) {
      if (remainder === "") continue;
      scripts.push({ line: index + 1, script: stripQuotes(remainder) });
      continue;
    }

    const body: string[] = [];
    let cursor = index + 1;
    while (cursor < lines.length) {
      const line = lines[cursor];
      if (line.trim() !== "" && indentOf(line) <= keyIndent) break;
      body.push(line);
      cursor += 1;
    }
    while (body.length > 0 && body[body.length - 1].trim() === "") body.pop();
    if (body.length === 0) {
      index = cursor - 1;
      continue;
    }

    const margin = Math.min(
      ...body.filter((line) => line.trim() !== "").map(indentOf)
    );
    const dedented = body.map((line) => line.slice(margin));

    scripts.push({
      line: index + 1,
      script: blockStyle[1] === ">" ? fold(dedented) : dedented.join("\n"),
    });
    index = cursor - 1;
  }

  return scripts;
}

/**
 * Anything bash writes to stderr is a finding, not just a non-zero exit: an
 * unterminated heredoc is only a *warning* under `-n`, yet it truncates the
 * step at runtime exactly like a syntax error would.
 *
 * `LC_ALL=C` keeps the diagnostic in English. Without it a developer's locale
 * decides the wording, so the message a reviewer reads is not the message CI
 * printed.
 */
function parseErrorOf(script: string): string | null {
  const bash = spawnSync("bash", ["-n"], {
    input: script.replace(GITHUB_EXPRESSION, "GHA_EXPRESSION"),
    env: { ...process.env, LC_ALL: "C" },
    encoding: "utf8",
  });
  const diagnostic = (bash.stderr ?? "").trim();
  if (diagnostic === "" && bash.status === 0) return null;
  return diagnostic === ""
    ? `bash -n exited ${bash.status}`
    : diagnostic.split("\n").join(" ");
}

export function validateWorkflowShellSyntax(
  content: string,
  filePath: string
): string[] {
  return extractRunScripts(content).flatMap(({ line, script }) => {
    const parseError = parseErrorOf(script);
    return parseError ? [`${filePath}:${line}: ${parseError}`] : [];
  });
}

function runCli(): void {
  const root = path.resolve(import.meta.dirname, "..");
  const workflowsDirectory = path.join(root, ".github/workflows");
  const errors = readdirSync(workflowsDirectory)
    .filter((name) => /\.ya?ml$/.test(name))
    .sort()
    .flatMap((name) =>
      validateWorkflowShellSyntax(
        readFileSync(path.join(workflowsDirectory, name), "utf8"),
        `.github/workflows/${name}`
      )
    );

  for (const error of errors) console.error(`check:workflow-shell — ${error}`);
  if (errors.length > 0) {
    process.exitCode = 1;
    return;
  }
  console.log("check:workflow-shell — OK");
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(import.meta.filename)
) {
  runCli();
}
