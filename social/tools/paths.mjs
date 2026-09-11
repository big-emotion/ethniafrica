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
import path from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

/** `social/tools` → the repository. */
export function repoRoot() {
  return path.resolve(HERE, "../..");
}

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
