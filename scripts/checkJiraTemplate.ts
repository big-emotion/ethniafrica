#!/usr/bin/env tsx

import { readFileSync } from "node:fs";
import path from "node:path";

const REQUIRED_SECTIONS = [
  "## User story",
  "## Business value",
  "## Scope",
  "## Acceptance criteria (Given-When-Then)",
  "## Confluence impact (load-bearing)",
  "## Dependencies",
];
const ALLOWED_VERBS = new Set(["NEW", "EDIT", "RETIRE"]);

export function validateJiraTemplate(content: string): string[] {
  const errors: string[] = [];
  for (const section of REQUIRED_SECTIONS) {
    if (!content.includes(section)) {
      errors.push(`missing required section "${section}"`);
    }
  }

  const impactPattern = /^•\s+((?:REQ|DEC|ARCH)-\d{3})\s+—\s+([A-Z]+)\b/gm;
  let match: RegExpExecArray | null;
  while ((match = impactPattern.exec(content))) {
    if (!ALLOWED_VERBS.has(match[2])) {
      errors.push(
        `unsupported Confluence impact verb "${match[2]}" for ${match[1]}`
      );
    }
  }

  return errors;
}

function runCli(): void {
  const root = path.resolve(import.meta.dirname, "..");
  const templatePath = path.join(
    root,
    "docs/templates/jira-ticket-template.md"
  );
  const errors = validateJiraTemplate(readFileSync(templatePath, "utf8"));
  if (errors.length > 0) {
    for (const error of errors) console.error(`check:jira-template — ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log("check:jira-template — OK");
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(import.meta.filename)
) {
  runCli();
}
