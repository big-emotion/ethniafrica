/**
 * Reading the dossier corpus off disk — no database, no admin client.
 *
 * Deliberately separate from the loader that writes to Supabase. The pages
 * render from this module, and pulling the service-role client into a page's
 * dependency graph to read three JSON files is how a server-only import ends
 * up one refactor away from a client component.
 *
 * The JSON in git is the source of truth for a dossier and the table is the
 * serving layer for everyone else — the public API and any reuser of the
 * CC BY-SA corpus. The site itself reads the source of truth, so a dossier is
 * never dark on a deploy that landed before its migration did.
 */
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

import { parseDossierFile } from "@/lib/afrik/parsers/dossierParser";
import type {
  Dossier,
  DossierVertical,
} from "@/lib/afrik/parsers/dossierTypes";

const DOSSIER_ROOT = join(process.cwd(), "dataset/source/afrik/dossiers");

export interface DossierCorpus {
  dossiers: Dossier[];
  errors: string[];
}

// @req REQ-114
export function readDossierCorpus(): DossierCorpus {
  const dossiers: Dossier[] = [];
  const errors: string[] = [];

  let filenames: string[];
  try {
    filenames = readdirSync(DOSSIER_ROOT).filter((name) =>
      name.endsWith(".json")
    );
  } catch {
    // An absent directory is a legitimate state on a branch that has authored
    // no dossier yet, not a load failure.
    return { dossiers: [], errors: [] };
  }

  for (const filename of filenames.sort()) {
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(join(DOSSIER_ROOT, filename), "utf8"));
    } catch (error) {
      errors.push(`${filename}: ${(error as Error).message}`);
      continue;
    }

    const parsed = parseDossierFile(raw);
    if (!parsed.success || !parsed.data) {
      errors.push(...parsed.errors.map((message) => `${filename}: ${message}`));
      continue;
    }

    // The filename carries the identifier, so a fiche cannot be found under
    // one name and served under another.
    if (filename !== `${parsed.data.id}.json`) {
      errors.push(`${filename}: file should be named ${parsed.data.id}.json`);
      continue;
    }

    dossiers.push(parsed.data);
  }

  return { dossiers, errors };
}

/**
 * Publication order, newest first — the order the Dossiers menu lists them in.
 * A dossier that fails the parser is not listed rather than listed broken.
 */
// @req REQ-114
export function listDossiers(vertical?: DossierVertical): Dossier[] {
  const { dossiers } = readDossierCorpus();
  const scoped = vertical
    ? dossiers.filter((dossier) => dossier.vertical === vertical)
    : dossiers;

  return [...scoped].sort((a, b) => b.publishedOn.localeCompare(a.publishedOn));
}

// @req REQ-114
export function getDossierBySlug(slug: string): Dossier | null {
  return (
    readDossierCorpus().dossiers.find((dossier) => dossier.slug === slug) ??
    null
  );
}
