#!/usr/bin/env tsx

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const COMMIT_SHA_PATTERN = /^[0-9a-f]{40}$/;

export interface ActionPin {
  /** `<filePath>:<line>` of the `uses:` key, for an error a reader can jump to. */
  location: string;
  reference: string;
  /** `owner/repo` — a sub-path action lives in, and resolves against, its repository. */
  repository: string;
  sha: string;
}

export type CommitExists = (
  repository: string,
  sha: string
) => Promise<boolean>;

function usesReferences(
  content: string
): { line: number; reference: string }[] {
  return content.split("\n").flatMap((text, index) => {
    const reference = text.match(/\buses:\s+(\S+)/)?.[1];
    if (!reference || reference.startsWith("./")) return [];
    return [{ line: index + 1, reference }];
  });
}

function revisionOf(reference: string): string {
  const separator = reference.lastIndexOf("@");
  return separator >= 0 ? reference.slice(separator + 1) : "";
}

export function validateActionPins(
  content: string,
  filePath: string
): string[] {
  return usesReferences(content)
    .filter(({ reference }) => !COMMIT_SHA_PATTERN.test(revisionOf(reference)))
    .map(
      ({ line, reference }) =>
        `${filePath}:${line}: action ${reference} is not pinned to a 40-character commit SHA`
    );
}

/** Pins with a well-formed SHA; malformed ones are `validateActionPins`' to report. */
export function extractActionPins(
  content: string,
  filePath: string
): ActionPin[] {
  return usesReferences(content).flatMap(({ line, reference }) => {
    const sha = revisionOf(reference);
    if (!COMMIT_SHA_PATTERN.test(sha)) return [];
    const [owner, repo] = reference
      .slice(0, reference.lastIndexOf("@"))
      .split("/");
    return [
      {
        location: `${filePath}:${line}`,
        reference,
        repository: `${owner}/${repo}`,
        sha,
      },
    ];
  });
}

/**
 * A SHA-shaped pin can still name a commit that was never published — a
 * mistyped or invented hash passes every shape check and fails only when the
 * runner tries to download the action, on whichever branch runs that workflow.
 */
export async function findUnresolvablePins(
  pins: ActionPin[],
  commitExists: CommitExists
): Promise<string[]> {
  const verdicts = new Map<string, Promise<boolean>>();
  for (const { repository, sha } of pins) {
    const key = `${repository}@${sha}`;
    if (!verdicts.has(key)) verdicts.set(key, commitExists(repository, sha));
  }

  const errors: string[] = [];
  for (const pin of pins) {
    if (!(await verdicts.get(`${pin.repository}@${pin.sha}`))) {
      errors.push(
        `${pin.location}: action ${pin.reference} points at a commit that does not exist in ${pin.repository}`
      );
    }
  }
  return errors;
}

/**
 * 404 and 422 are GitHub's two answers for "no such commit". Anything else —
 * a rate limit above all — throws, because reporting an unchecked pin as
 * present is the silent pass this mode exists to remove.
 */
const githubCommitExists: CommitExists = async (repository, sha) => {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "ethniafrica-check-action-pins",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const response = await fetch(
    `https://api.github.com/repos/${repository}/commits/${sha}`,
    { headers }
  );
  if (response.ok) return true;
  if (response.status === 404 || response.status === 422) return false;
  throw new Error(
    `GitHub answered ${response.status} for ${repository}@${sha}; set GITHUB_TOKEN if this is a rate limit`
  );
};

async function runCli(): Promise<void> {
  const root = path.resolve(import.meta.dirname, "..");
  const workflowsDirectory = path.join(root, ".github/workflows");
  const workflows = readdirSync(workflowsDirectory)
    .filter((name) => /\.ya?ml$/.test(name))
    .map((name) => ({
      relative: `.github/workflows/${name}`,
      content: readFileSync(path.join(workflowsDirectory, name), "utf8"),
    }));

  const errors = workflows.flatMap(({ relative, content }) =>
    validateActionPins(content, relative)
  );

  if (process.argv.includes("--resolve")) {
    const pins = workflows.flatMap(({ relative, content }) =>
      extractActionPins(content, relative)
    );
    errors.push(...(await findUnresolvablePins(pins, githubCommitExists)));
  }

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
  runCli().catch((error: unknown) => {
    console.error(`check:action-pins — ${String(error)}`);
    process.exitCode = 1;
  });
}
