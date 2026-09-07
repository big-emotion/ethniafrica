/**
 * Leaf walkers for the strict models and for the records shaped by them.
 *
 * A translation class is declared per *leaf path*, in the model's own
 * vocabulary: `content.sources[].title` names every source title however many
 * sources a fiche carries, and `_meta.*` names a subtree whose keys are
 * authoring metadata rather than schema. Two walkers share that vocabulary —
 * one over a model, which yields the paths a declaration must cover, and one
 * over a record, which yields the concrete leaves a translated record carries
 * together with the model path each one instantiates.
 */

type Segment = string | number;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function joinPath(parent: string, key: string): string {
  return parent ? `${parent}.${key}` : key;
}

/**
 * Every leaf path of a model. Arrays collapse to `[]` — a primitive array and
 * an empty array are one leaf, an array of objects contributes the union of
 * its elements' leaves — and each `wildcardSubtrees` entry becomes a single
 * `<path>.*` leaf, because its keys (ISO codes, `_meta` fields) are data.
 */
// @req REQ-143
export function modelLeafPaths(
  model: unknown,
  wildcardSubtrees: readonly string[]
): string[] {
  const wildcard = new Set(wildcardSubtrees);
  const leaves: string[] = [];
  const push = (path: string) => {
    if (!leaves.includes(path)) leaves.push(path);
  };

  const walk = (value: unknown, path: string) => {
    if (wildcard.has(path)) {
      push(`${path}.*`);
      return;
    }
    if (Array.isArray(value)) {
      const objectElements = value.filter(isPlainObject);
      if (objectElements.length === 0 || objectElements.length < value.length) {
        push(`${path}[]`);
        return;
      }
      for (const element of objectElements) walk(element, `${path}[]`);
      return;
    }
    if (isPlainObject(value) && Object.keys(value).length > 0) {
      for (const [key, child] of Object.entries(value)) {
        walk(child, joinPath(path, key));
      }
      return;
    }
    push(path);
  };

  walk(model, "");
  return leaves;
}

export interface RecordLeaf {
  /** The concrete location, indices included: `["content", "exonyms", 1]`. */
  segments: Segment[];
  /** The model path this leaf instantiates: `content.exonyms[]`. */
  modelPath: string;
  value: unknown;
}

/**
 * The concrete leaves of one record, in document order. An empty array or
 * object holds no value and yields no leaf — there is nothing in it to
 * translate or to compare.
 */
// @req REQ-143
export function recordLeaves(record: unknown): RecordLeaf[] {
  const leaves: RecordLeaf[] = [];

  const walk = (value: unknown, segments: Segment[], modelPath: string) => {
    if (Array.isArray(value)) {
      value.forEach((element, index) =>
        walk(element, [...segments, index], `${modelPath}[]`)
      );
      return;
    }
    if (isPlainObject(value)) {
      for (const [key, child] of Object.entries(value)) {
        walk(child, [...segments, key], joinPath(modelPath, key));
      }
      return;
    }
    leaves.push({ segments, modelPath, value });
  };

  walk(record, [], "");
  return leaves;
}

/** `content.exonyms[1]` — how a concrete leaf is named to a human. */
// @req REQ-143
export function formatSegments(segments: readonly Segment[]): string {
  return segments.reduce<string>(
    (path, segment) =>
      typeof segment === "number"
        ? `${path}[${segment}]`
        : joinPath(path, segment),
    ""
  );
}

/** The value a record holds at a concrete location, or undefined. */
// @req REQ-143
export function valueAt(
  record: unknown,
  segments: readonly Segment[]
): unknown {
  let cursor: unknown = record;
  for (const segment of segments) {
    if (cursor === null || typeof cursor !== "object") return undefined;
    cursor = (cursor as Record<string, unknown>)[segment as string];
  }
  return cursor;
}
