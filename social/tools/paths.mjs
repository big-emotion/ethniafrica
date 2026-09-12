/**
 * The roots these tools read and write, and why none of them is derived.
 *
 * The tools used to live inside the production library, where `../..` was the
 * workshop and `../../..` the library root. Versioning them turned both
 * derivations into a lie, and a quiet one: a walk over a directory that does not
 * exist returns nothing, which is indistinguishable from a library with no
 * subjects in it.
 *
 * Two shelves, two variables, neither computed from the other:
 *
 * - `ETHNIAFRICA_SOCIAL_PROJECTS` — one subdirectory per subject in production.
 *   The Python engine reads the same variable; see `social/harness/ethni_paths.py`.
 * - `ETHNIAFRICA_SOCIAL_POSTS` — posts that have shipped or are waiting to.
 *
 * The gabarit spec is the exception: it is versioned with the engine that reads
 * it, so it resolves from the repository and needs no configuration at all.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * Read the repository's `.env.local`, which only Next otherwise parses.
 *
 * These tools run under plain `node`, so `process.env` knows nothing about that
 * file. Skipping it would mean declaring the same two directories a second time
 * in a shell profile, and the two copies would disagree the first time one
 * moved.
 *
 * The environment wins and an empty value is not a value — `.env.example` ships
 * every key empty, and read as a setting it would turn "not configured" into
 * "configured to nothing". Mirrors `social/harness/ethni_env.py`.
 */
export function loadEnvLocal(file = path.join(repoRoot(), ".env.local")) {
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    return;
  }
  for (const raw of text.split("\n")) {
    const line = raw.trim().replace(/^export\s+/, "");
    if (!line || line.startsWith("#")) continue;
    const at = line.indexOf("=");
    if (at <= 0) continue;
    const name = line.slice(0, at).trim();
    let value = line.slice(at + 1).trim();
    if (
      value.length >= 2 &&
      value[0] === value.at(-1) &&
      /["']/.test(value[0])
    ) {
      value = value.slice(1, -1);
    }
    if (name && value && process.env[name] === undefined)
      process.env[name] = value;
  }
}

/** `social/tools` → the repository. */
export function repoRoot() {
  return path.resolve(HERE, "../..");
}

loadEnvLocal();

/**
 * Where a subject in production lives.
 *
 * Unset, it falls back inside the checkout so a fresh clone works with nothing
 * configured. `output/` is gitignored, so those files are lost with the
 * worktree — which is the argument for setting the variable, not a defect.
 */
export function productionsRoot() {
  const declared = (process.env.ETHNIAFRICA_SOCIAL_PROJECTS ?? "").trim();
  if (declared) return path.resolve(declared);
  return path.join(repoRoot(), "output", "social");
}

/**
 * Where published and pending posts live, or `null` when nothing says.
 *
 * No fallback on purpose. A checkout holds no published posts, and inventing an
 * empty directory would let a tool report a complete library with zero subjects
 * instead of admitting it was never told where to look.
 */
export function publicationsRoot() {
  const declared = (process.env.ETHNIAFRICA_SOCIAL_POSTS ?? "").trim();
  return declared ? path.resolve(declared) : null;
}

/** The gabarit spec and its tokens, versioned beside the engine. */
export function gabarits() {
  return path.join(repoRoot(), "docs", "design", "gabarits-social");
}
