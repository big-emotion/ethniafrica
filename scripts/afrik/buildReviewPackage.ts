#!/usr/bin/env tsx
/**
 * Emit the human review package for the English sidecars on disk (ETNI-1878).
 *
 *   npx tsx scripts/afrik/buildReviewPackage.ts --lang en
 *   npx tsx scripts/afrik/buildReviewPackage.ts --lang en --id NGA --id PPL_HAUSA
 *   npx tsx scripts/afrik/buildReviewPackage.ts --lang en --out docs/editorial/review/wave-1.md
 *
 * Reads only; writes nothing but the package it is asked for. It cannot
 * promote a translation's provenance — that is a human act recorded against a
 * human name (see scripts/lib/reviewPackage.ts).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import {
  CORPUS_ROOT as CORPUS_RELATIVE,
  TRANSLATIONS_ROOT as TRANSLATIONS_RELATIVE,
  listTranslationSidecars,
} from "@/lib/afrik/translations/sidecarPaths";
import type { TranslationLocale } from "@/lib/i18n/translationLocale";
import {
  buildReviewPackage,
  renderReviewPackage,
  type ReviewSubject,
} from "../lib/reviewPackage";

function parseFlags(argv: string[]): {
  lang: string | undefined;
  ids: string[];
  out: string | undefined;
} {
  const ids: string[] = [];
  let lang: string | undefined;
  let out: string | undefined;
  for (let index = 0; index < argv.length; index += 1) {
    const [name, inline] = argv[index].startsWith("--")
      ? argv[index].slice(2).split("=", 2)
      : [undefined, undefined];
    if (!name) continue;
    const value =
      inline ??
      (argv[index + 1] && !argv[index + 1].startsWith("--")
        ? argv[(index += 1)]
        : undefined);
    if (name === "lang") lang = value;
    else if (name === "id" && value) ids.push(value);
    else if (name === "out") out = value;
  }
  return { lang, ids, out };
}

/** `pays/NGA.json` → `NGA`; the sidecar tree mirrors the source tree. */
function recordIdOf(relativePath: string): string {
  return relativePath
    .split("/")
    .pop()!
    .replace(/\.json$/, "");
}

function main(): void {
  const { lang, ids, out } = parseFlags(process.argv.slice(2));
  if (lang !== "en") {
    console.error("buildReviewPackage — --lang en is the only target today");
    process.exitCode = 2;
    return;
  }

  const corpusRoot = resolve(process.cwd(), CORPUS_RELATIVE);
  const translationsRoot = resolve(process.cwd(), TRANSLATIONS_RELATIVE);
  const wanted = new Set(ids);

  const subjects: ReviewSubject[] = [];
  for (const relativePath of listTranslationSidecars(
    translationsRoot,
    lang as TranslationLocale
  )) {
    const recordId = recordIdOf(relativePath);
    if (wanted.size > 0 && !wanted.has(recordId)) continue;

    const sourceFile = join(corpusRoot, relativePath);
    if (!existsSync(sourceFile)) {
      console.error(`skipped ${relativePath} — no French source on disk`);
      continue;
    }
    subjects.push({
      recordId,
      sourceRelativePath: relativePath,
      source: JSON.parse(readFileSync(sourceFile, "utf-8")),
      sidecar: JSON.parse(
        readFileSync(join(translationsRoot, lang, relativePath), "utf-8")
      ),
    });
  }

  if (subjects.length === 0) {
    console.error(
      wanted.size > 0
        ? `buildReviewPackage — none of the named records has an ${lang} sidecar yet`
        : `buildReviewPackage — no ${lang} sidecar on disk yet`
    );
    process.exitCode = 1;
    return;
  }

  const pkg = buildReviewPackage(subjects, lang as TranslationLocale);
  const markdown = renderReviewPackage(pkg);

  if (out) {
    const file = resolve(process.cwd(), out);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, `${markdown}\n`, "utf-8");
    console.error(
      `buildReviewPackage — ${pkg.records.length} record(s), ${pkg.itemCount} path(s), ${pkg.unresolvedCount} unresolved → ${out}`
    );
  } else {
    process.stdout.write(`${markdown}\n`);
  }
}

main();
