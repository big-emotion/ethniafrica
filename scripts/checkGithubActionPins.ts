#!/usr/bin/env tsx

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const COMMIT_SHA_PATTERN = /^[0-9a-f]{40}$/;

export function validateActionPins(
  content: string,
  filePath: string
): string[] {
  const errors: string[] = [];
  const lines = content.split("\n");

  for (let index = 0; index < lines.length; index += 1) {
    const reference = lines[index]?.match(/\buses:\s+(\S+)/)?.[1];
    if (!reference || reference.startsWith("./")) continue;

    const separator = reference.lastIndexOf("@");
    const revision = separator >= 0 ? reference.slice(separator + 1) : "";
    if (!COMMIT_SHA_PATTERN.test(revision)) {
      errors.push(
        `${filePath}:${index + 1}: action ${reference} is not pinned to a 40-character commit SHA`
      );
    }
  }

  return errors;
}

function runCli(): void {
  const root = path.resolve(import.meta.dirname, "..");
  const workflowsDirectory = path.join(root, ".github/workflows");
  const errors = readdirSync(workflowsDirectory)
    .filter((name) => /\.ya?ml$/.test(name))
    .flatMap((name) => {
      const relative = `.github/workflows/${name}`;
      return validateActionPins(
        readFileSync(path.join(workflowsDirectory, name), "utf8"),
        relative
      );
    });

  for (const error of errors) console.error(`check:action-pins — ${error}`);
  if (errors.length > 0) {
    process.exitCode = 1;
    return;
  }
  console.log("check:action-pins — OK");
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(import.meta.filename)
) {
  runCli();
}
