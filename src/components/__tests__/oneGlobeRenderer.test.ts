/**
 * One globe in the repository (ETNI-1360).
 *
 * For a year the atlas carried two: `AtlasGlobeCanvas` for the fiches and
 * `HomeGlobe` for the home hero, 719 and 639 lines of hand-written WebGL 1
 * with their own GLSL, drawing the same continent. Each needed its own
 * fallback, its own tests and its own reviewers, and the two diverge the first
 * time one is fixed under deadline — which is what this guard is here to stop
 * happening again rather than to be discovered again.
 *
 * **Why the predicate has two halves.** The previous attempt at this ticket
 * (ETNI-1288) failed on its own criterion because "counts WebGL contexts" is
 * not "counts globes": on a correct repository that count is four, and three
 * of the four are legitimate.
 *
 *   - `AxisGraphScene.tsx` is a real WebGL renderer, and it stays. It draws
 *     the home's axis link graph, which is not a globe and is explicitly out
 *     of scope. Consolidating it, if it is ever worth doing, is its own
 *     ticket.
 *   - `AtlasGlobe.tsx` and `lib/home/webglSupport.ts` create a context only to
 *     ask whether one *can* be created. They keep nothing and draw nothing.
 *
 * So a globe renderer is a file that (a) keeps the context it acquires, which
 * separates a renderer from a probe, and (b) drives the projection morph,
 * which separates the globe from every other thing one might draw with a kept
 * context. The morph is the right half of that pair because it is the atlas's
 * own claim (REQ-112): the globe is the surface that carries the reader
 * between the flat Mercator map and the area-true sphere. Nothing else in this
 * codebase has a reason to interpolate between the two.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const COMPONENTS_DIR = resolve(process.cwd(), "src/components");

/**
 * The acquisition, bound to a name.
 *
 * A probe reads `Boolean(canvas.getContext("webgl"))` and throws the context
 * away; a renderer binds it, because it has to issue calls on it afterwards.
 * Requiring the binding is what keeps the two capability probes from being
 * reported as engines.
 */
const KEEPS_A_WEBGL_CONTEXT =
  /(?:const|let|var)\s+\w+\s*(?::[^=]+)?=\s*\(?\s*\w+\.getContext\(\s*["'](?:webgl|experimental-webgl)["']/;

/**
 * The projection morph, in any of the spellings the atlas uses for it: the
 * shader uniform, the two named ends, or the camera field they land in.
 */
const DRIVES_THE_PROJECTION_MORPH =
  /\buMorph\b|\bFLAT_MORPH\b|\bSPHERE_MORPH\b|\bmorph\s*[:.]/;

function componentFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      return entry === "__tests__" ? [] : componentFiles(full);
    }
    return /\.tsx?$/.test(entry) ? [full] : [];
  });
}

function isGlobeRenderer(source: string): boolean {
  return (
    KEEPS_A_WEBGL_CONTEXT.test(source) &&
    DRIVES_THE_PROJECTION_MORPH.test(source)
  );
}

function globeRenderersUnderComponents(): string[] {
  return componentFiles(COMPONENTS_DIR)
    .filter((file) => isGlobeRenderer(readFileSync(file, "utf8")))
    .map((file) => relative(process.cwd(), file))
    .sort();
}

describe("exactly one globe renderer survives under src/components", () => {
  // @req REQ-112
  it("finds AtlasGlobeCanvas and nothing else", () => {
    expect(globeRenderersUnderComponents()).toEqual([
      "src/components/atlas/AtlasGlobeCanvas.tsx",
    ]);
  });

  // @req REQ-112
  it("does not mistake the capability probe beside the globe for a second one", () => {
    const atlasGlobe = readFileSync(
      resolve(COMPONENTS_DIR, "atlas/AtlasGlobe.tsx"),
      "utf8"
    );

    expect(atlasGlobe).toContain('getContext("webgl")');
    expect(isGlobeRenderer(atlasGlobe)).toBe(false);
  });

  /**
   * A guard that has never rejected anything is a guard nobody has tested. The
   * decoy is the shape the deleted engine had — its own kept context, its own
   * morph — so this states what would actually be caught.
   */
  // @req REQ-112
  it("rejects a second engine of the shape the deleted one had", () => {
    const secondGlobe = [
      'const gl = canvas.getContext("webgl");',
      "gl.uniform1f(uMorph, camera.morph);",
    ].join("\n");

    expect(isGlobeRenderer(secondGlobe)).toBe(true);
  });

  /**
   * The three files the point cloud shipped in. Named individually because
   * "one renderer survives" would still hold if a dead copy sat unimported
   * beside it, and a dead copy is what the next reader would resurrect.
   */
  // @req REQ-112
  it("keeps the point cloud deleted rather than merely unimported", () => {
    const survivors = componentFiles(COMPONENTS_DIR)
      .map((file) => relative(process.cwd(), file))
      .filter((file) => /\/HomeGlobe(Stage|Fallback)?\.tsx$/.test(file));

    expect(survivors).toEqual([]);
  });
});
