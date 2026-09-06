#!/usr/bin/env tsx
/**
 * Translate any content record with one command (REQ-146).
 *
 *   npm run translate:record -- --id PPL_ASANTE --lang en
 *   npm run translate:record -- --batch dataset/source/afrik/langues --lang en
 *   npm run translate:record -- --id GHA --lang en --drift
 *   npm run translate:record -- --batch dataset/source/afrik/pays --lang en --dry-run
 *
 * Flags: --id <PPL_|FLG_|PAT_|REL_|MGR_|ONS_|ISO3|iso639-3|dir/ID>, --lang en,
 * --batch <directory under dataset/source/afrik> (recursive; worksheets,
 * logs/, archive/ and illustrative fixtures excluded), --drift (re-translate
 * only the fields whose source moved, keep the rest), --dry-run (print the
 * skeleton and the prompt, call nothing), --concurrency n (default 3),
 * --max-budget-usd n per call (default 0.5), --model m (default sonnet),
 * --force (re-translate an up-to-date sidecar).
 *
 * Per-record lines go to stderr as they finish; the JSON summary goes to
 * stdout at the end, so a wave can be piped into a file and read back. The
 * process exits 1 when any record failed. Runbook:
 * docs/runbooks/corpus-translation.md.
 */

import { resolve } from "node:path";

import { sweepInParallel } from "@/lib/parallelSweep";
import {
  CORPUS_ROOT as CORPUS_RELATIVE,
  TRANSLATIONS_ROOT as TRANSLATIONS_RELATIVE,
} from "@/lib/afrik/translations/sidecarPaths";
import { claudeCliProvider } from "./lib/claudeCliProvider";
import {
  listBatchRecords,
  resolveRecordPath,
  translateRecord,
  type RecordOutcome,
  type TranslateOptions,
} from "./lib/translateRecord";

const CORPUS_ROOT = resolve(process.cwd(), CORPUS_RELATIVE);
const TRANSLATIONS_ROOT = resolve(process.cwd(), TRANSLATIONS_RELATIVE);
const TRANSLATOR_REFERENCE = resolve(
  process.cwd(),
  ".claude/skills/afrik-translator/reference"
);

/** `--flag value` and `--flag=value` both read; a bare `--flag` is `true`. */
function parseFlags(argv: string[]): Record<string, string | true> {
  const flags: Record<string, string | true> = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith("--")) continue;
    const [name, inlineValue] = argument.slice(2).split("=", 2);
    if (inlineValue !== undefined) {
      flags[name] = inlineValue;
    } else if (
      argv[index + 1] !== undefined &&
      !argv[index + 1].startsWith("--")
    ) {
      flags[name] = argv[index + 1];
      index += 1;
    } else {
      flags[name] = true;
    }
  }
  return flags;
}

function numberFlag(
  value: string | true | undefined,
  fallback: number
): number {
  if (typeof value !== "string") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function describe(outcome: RecordOutcome): string {
  switch (outcome.status) {
    case "skipped":
      return `skipped     ${outcome.relativePath} — ${outcome.reason}`;
    case "dry-run":
      return `dry-run     ${outcome.relativePath} — ${outcome.skeleton.leaves.length} leaves to translate, ${outcome.skeleton.reviewRequired.length} review-required`;
    case "translated":
      return `translated  ${outcome.relativePath} — ${outcome.leaves} leaves, ${outcome.model}, $${outcome.costUsd.toFixed(4)}${
        outcome.driftedPaths
          ? ` (drifted: ${outcome.driftedPaths.join(", ") || "none"})`
          : ""
      }`;
    case "failed":
      return `FAILED      ${outcome.relativePath} — ${outcome.reason} ($${outcome.costUsd.toFixed(4)})`;
  }
}

async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));
  const lang = flags.lang;
  if (lang !== "en") {
    console.error(
      "translate:record — --lang en is the only target locale today"
    );
    process.exitCode = 2;
    return;
  }

  let records: string[];
  if (typeof flags.id === "string") {
    records = [resolveRecordPath(flags.id, CORPUS_ROOT)];
  } else if (typeof flags.batch === "string") {
    records = listBatchRecords(
      CORPUS_ROOT,
      resolve(process.cwd(), flags.batch)
    );
  } else {
    console.error(
      "translate:record — name a record with --id <ID> or a directory with --batch <dir>"
    );
    process.exitCode = 2;
    return;
  }

  const options: TranslateOptions = {
    lang,
    corpusRoot: CORPUS_ROOT,
    translationsRoot: TRANSLATIONS_ROOT,
    model: typeof flags.model === "string" ? flags.model : "sonnet",
    maxBudgetUsd: numberFlag(flags["max-budget-usd"], 0.5),
    force: flags.force === true,
    drift: flags.drift === true,
    dryRun: flags["dry-run"] === true,
    registerReferenceDir: TRANSLATOR_REFERENCE,
  };
  const concurrency = Math.floor(numberFlag(flags.concurrency, 3));
  const provider = claudeCliProvider();

  console.error(
    `translate:record — ${records.length} record(s), lang=${lang}, model=${options.model}, concurrency=${concurrency}${options.dryRun ? ", dry run" : ""}${options.drift ? ", drift mode" : ""}`
  );

  const outcomes = await sweepInParallel(
    records,
    concurrency,
    async (record) => {
      const outcome = await translateRecord(record, options, provider);
      console.error(describe(outcome));
      if (outcome.status === "dry-run") {
        // The skeleton and the prompt are the whole point of a dry run.
        console.log(JSON.stringify(outcome, null, 2));
      }
      return outcome;
    }
  );

  const settled: RecordOutcome[] = outcomes.map((outcome, index) =>
    outcome instanceof Error
      ? {
          status: "failed",
          relativePath: records[index],
          reason: outcome.message,
          costUsd: 0,
        }
      : outcome
  );
  const totals = {
    translated: settled.filter((o) => o.status === "translated").length,
    skipped: settled.filter((o) => o.status === "skipped").length,
    dryRun: settled.filter((o) => o.status === "dry-run").length,
    failed: settled.filter((o) => o.status === "failed").length,
    costUsd: settled.reduce(
      (sum, o) => sum + ("costUsd" in o ? o.costUsd : 0),
      0
    ),
  };

  if (!options.dryRun) {
    console.log(
      JSON.stringify(
        {
          lang,
          model: options.model,
          totals,
          records: settled.map((o) =>
            o.status === "dry-run"
              ? { status: o.status, relativePath: o.relativePath }
              : o
          ),
        },
        null,
        2
      )
    );
  }
  console.error(
    `translate:record — translated ${totals.translated}, skipped ${totals.skipped}, failed ${totals.failed}, cost $${totals.costUsd.toFixed(4)}`
  );
  process.exitCode = totals.failed > 0 ? 1 : 0;
}

if (require.main === module) {
  main().catch((error) => {
    console.error(
      `translate:record — ${error instanceof Error ? error.message : String(error)}`
    );
    process.exitCode = 1;
  });
}
