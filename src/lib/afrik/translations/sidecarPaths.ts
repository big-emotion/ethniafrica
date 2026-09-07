/**
 * Where a translated record lives, and how it is read and written (REQ-146).
 *
 * `dataset/translations/<lang>/<same relative path as under
 * dataset/source/afrik>/<ID>.json`, a mirrored tree rather than a
 * `<ID>.<lang>.json` sibling. Forty-five discovery sites under loaders,
 * validators, gates and tests select fiches with `endsWith(".json")`; a
 * colocated sidecar would be ingested as a second fiche by every one of them
 * and duplicate every upsert. A parallel tree needs no exclusion anywhere,
 * and a third locale is a directory.
 *
 * Files are written through prettier because `format:check` walks
 * `dataset/` — `JSON.stringify(x, null, 2)` is not prettier output (short
 * arrays collapse onto one line).
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, posix, sep } from "node:path";
import * as prettier from "prettier";

import type { TranslationLocale } from "@/lib/i18n/translationLocale";
import {
  TRANSLATION_BLOCK_KEY,
  translationBlockSchema,
  type TranslationSidecar,
} from "./types";

// @req REQ-146
export const CORPUS_ROOT = "dataset/source/afrik";
// @req REQ-146
export const TRANSLATIONS_ROOT = "dataset/translations";

function toPosix(path: string): string {
  return path.split(sep).join("/");
}

// @req REQ-146
export function sidecarPathFor(
  sourceRelativePath: string,
  lang: TranslationLocale
): string {
  return posix.join(TRANSLATIONS_ROOT, lang, toPosix(sourceRelativePath));
}

// @req REQ-146
export function sourcePathFor(sidecarPath: string): {
  lang: TranslationLocale;
  sourceRelativePath: string;
} {
  const normalized = toPosix(sidecarPath);
  const prefix = `${TRANSLATIONS_ROOT}/`;
  const index = normalized.indexOf(prefix);
  if (index === -1) {
    throw new Error(`${sidecarPath} is not under ${TRANSLATIONS_ROOT}/`);
  }
  const [lang, ...rest] = normalized.slice(index + prefix.length).split("/");
  if ((lang !== "en" && lang !== "fr") || rest.length === 0) {
    throw new Error(`${sidecarPath} does not name a locale and a record`);
  }
  return { lang, sourceRelativePath: rest.join("/") };
}

/**
 * Every sidecar of one locale, as paths relative to the source corpus. A
 * `_`-prefixed file is a worksheet wherever it sits, and is left alone here
 * as it is under the source tree.
 */
// @req REQ-146
export function listTranslationSidecars(
  translationsRoot: string,
  lang: TranslationLocale
): string[] {
  const localeRoot = join(translationsRoot, lang);
  if (!existsSync(localeRoot)) return [];

  const found: string[] = [];
  const walk = (directory: string, relative: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const childRelative = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walk(join(directory, entry.name), childRelative);
      } else if (
        entry.isFile() &&
        entry.name.endsWith(".json") &&
        !entry.name.startsWith("_")
      ) {
        found.push(childRelative);
      }
    }
  };
  walk(localeRoot, "");
  return found.sort();
}

// @req REQ-146
export function readTranslationSidecar(file: string): TranslationSidecar {
  const parsed = JSON.parse(readFileSync(file, "utf-8")) as Record<
    string,
    unknown
  >;
  const block = translationBlockSchema.safeParse(parsed[TRANSLATION_BLOCK_KEY]);
  if (!block.success) {
    const detail = block.error.issues
      .map(
        (issue) => `${issue.path.join(".") || "_translation"}: ${issue.message}`
      )
      .join("; ");
    throw new Error(`${file}: invalid _translation block — ${detail}`);
  }
  return { ...parsed, [TRANSLATION_BLOCK_KEY]: block.data };
}

// @req REQ-146
export async function writeTranslationSidecar(
  file: string,
  sidecar: TranslationSidecar
): Promise<void> {
  const prettierConfig = await prettier.resolveConfig(file);
  const formatted = await prettier.format(JSON.stringify(sidecar), {
    ...prettierConfig,
    parser: "json",
  });
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, formatted, "utf-8");
}
