/**
 * Field-provenance model (REQ-119).
 *
 * A fiche field the corpus does not fill must render as explicitly missing,
 * not be hidden behind an omitted section — but only when the field is one
 * the entity's strict model actually expects. A field absent from the model
 * does not exist, so it is never "missing"; that distinction is what
 * `isStructurallyExpectedField` answers, kept separate from
 * `classifyFieldProvenance` so a caller cannot accidentally flag a spurious
 * gap by skipping the model check.
 */

import modeleLinguistique from "../../public/modele-linguistique.json";
import modelePeuple from "../../public/modele-peuple.json";
import modelePays from "../../public/modele-pays.json";
import modeleLangue from "../../public/modele-langue.json";
import modeleNomPatronyme from "../../public/modele-nom-patronyme.json";
import modeleNomNisba from "../../public/modele-nom-nisba.json";
import modeleNomPatronymique from "../../public/modele-nom-patronymique.json";
import modeleNomTotemique from "../../public/modele-nom-totemique.json";

export type ProvenanceState = "declared" | "derived" | "missing";

/**
 * True when a value — or any leaf nested inside it — carries actual content.
 *
 * An empty string, an empty array, an object whose every leaf is empty: all
 * absent. It lived in the panel composer, which gated a chapter on it; the
 * composer is retired and provenance is the only caller left, which is where
 * it always belonged — "is this field filled" is the provenance question.
 */
// @req REQ-119
export function isPresent(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.some(isPresent);
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some(isPresent);
  }
  return true;
}

export interface FieldProvenance {
  state: ProvenanceState;
  /** Names what the value was computed from. Set only when state is "derived". */
  origin?: string;
}

export interface DerivedFieldInput {
  value: unknown;
  origin: string;
}

/**
 * Classifies one field's value: `declared` when the fiche's own source fills
 * it, `derived` when it falls back to a value computed from other records
 * (never overriding a declared value), `missing` when neither carries
 * content.
 */
// @req REQ-119
export function classifyFieldProvenance(
  declaredValue: unknown,
  derived?: DerivedFieldInput
): FieldProvenance {
  if (isPresent(declaredValue)) {
    return { state: "declared" };
  }
  if (derived && isPresent(derived.value)) {
    return { state: "derived", origin: derived.origin };
  }
  return { state: "missing" };
}

type ContentBagLike = Record<string, unknown>;

export type AfrikEntityKind =
  "language-family" | "people" | "country" | "language" | "name";

/**
 * The object a field path resolves against, per class.
 *
 * For the three classes that came first, every fiche field lives inside the
 * model's `content` block, so that block is the root and a path is written
 * without a `content.` prefix. The two classes added later put their fields
 * elsewhere, and the root follows the model rather than the other way round:
 * a language splits its fields between the document root (`glottocode`) and
 * `content` (`dialects`), and a patronyme declares all fifteen at the root.
 *
 * Both of those models match their corpus key for key — 10 + 4 across the 24
 * language fiches, 15 across the 30 patronyme dossiers — so the model is a
 * sound contract to read chapters off, not an approximation of one.
 */
/**
 * The name class declares a base model plus one per naming system, and only
 * the base one describes what the corpus writes: all 30 dossiers match
 * `modele-nom-patronyme.json` key for key, while the four subtype models
 * still describe the retired vocabulary the fiche was reading — `namingSystem`
 * for `nameSystem`, `attestedForms` for `spellings`. Merging all five would
 * re-admit exactly the drift this resolver exists to catch.
 *
 * So the base model is the contract, extended with the subtype fields that a
 * dossier's `gaps[]` actually cites — otherwise those gaps would be dismissed
 * as fields that do not exist, and the editor's wording would stay unread for
 * a second reason after the first is fixed.
 *
 * The extension is deliberately not narrowed per `nameSystem`: the view only
 * asks about a subtype field on a fiche of that subtype, so keeping one root
 * avoids threading the discriminant through a purely structural check.
 */
const NAME_SUBTYPE_FIELDS = {
  totemicFoodProhibition: (modeleNomTotemique as ContentBagLike)
    .totemicFoodProhibition,
  permittedGivenNames: (modeleNomTotemique as ContentBagLike)
    .permittedGivenNames,
  nisbaSubtype: (modeleNomNisba as ContentBagLike).nisbaSubtype,
  patronymicChainDepth: (modeleNomPatronymique as ContentBagLike)
    .patronymicChainDepth,
};

const NAME_MODEL_FIELD_ROOT = {
  ...modeleNomPatronyme,
  ...NAME_SUBTYPE_FIELDS,
};

const MODEL_FIELD_ROOT_BY_ENTITY: Record<AfrikEntityKind, unknown> = {
  "language-family": (modeleLinguistique as { content?: unknown }).content,
  people: (modelePeuple as { content?: unknown }).content,
  country: (modelePays as { content?: unknown }).content,
  language: modeleLangue,
  name: NAME_MODEL_FIELD_ROOT,
};

/**
 * Keys a model carries that address the fiche rather than describe it, so
 * they are never offered as chapters: `_meta` documents the model itself and
 * `id` is the fiche's address.
 */
const NON_CHAPTER_KEYS = new Set(["_meta", "id"]);

function getAtPath(source: unknown, segments: string[]): unknown {
  return segments.reduce<unknown>((cursor, key) => {
    if (
      cursor !== null &&
      typeof cursor === "object" &&
      key in (cursor as Record<string, unknown>)
    ) {
      return (cursor as Record<string, unknown>)[key];
    }
    return undefined;
  }, source);
}

/**
 * True when `fieldPath` (dot-separated, relative to the entity's field root —
 * e.g. "generalInfo.branches" for a family, "content.dialects" for a
 * language) names a field declared in `public/modele-*.json` for that kind.
 */
// @req REQ-119
export function isStructurallyExpectedField(
  entityKind: AfrikEntityKind,
  fieldPath: string
): boolean {
  const root = MODEL_FIELD_ROOT_BY_ENTITY[entityKind];
  const segments = fieldPath.split(".").filter(Boolean);
  return getAtPath(root, segments) !== undefined;
}

function ownFieldNames(source: unknown): string[] {
  if (source === null || typeof source !== "object") return [];
  return Object.keys(source as Record<string, unknown>).filter(
    (key) => !NON_CHAPTER_KEYS.has(key)
  );
}

/**
 * Every field path a class's strict model declares, in the order the model
 * writes them — the chapter list a fiche owes its reader.
 *
 * A `content` block is expanded one level rather than offered as a single
 * chapter, so a language's `dialects` addresses as "content.dialects" and
 * sits beside "glottocode" in one flat list. The three older classes have
 * their root at `content` already and so expand nothing.
 *
 * This exists so a chapter cannot be silently dropped. It was a hand-written
 * list in each view until now, which is a template only by convention — and
 * convention held on the three classes a charter test covered, then stopped.
 */
// @req REQ-119
export function modelChapterKeys(entityKind: AfrikEntityKind): string[] {
  const root = MODEL_FIELD_ROOT_BY_ENTITY[entityKind];
  return ownFieldNames(root).flatMap((key) => {
    if (key !== "content") return [key];
    const nested = (root as Record<string, unknown>).content;
    return ownFieldNames(nested).map((child) => `content.${child}`);
  });
}

export type ChapterState = ProvenanceState | "documented-gap" | "not-modelled";

export interface ChapterResolution {
  state: ChapterState;
  /** Set only when state is "derived" — what the value was computed from. */
  origin?: string;
  /** Set only when state is "documented-gap" — the editor's own wording. */
  reason?: string;
}

/** One `gaps[]` entry: a field path, and why the corpus leaves it empty. */
export interface FieldGap {
  fieldPath: string;
  reason: string;
}

/**
 * Resolves one chapter of a fiche, and never resolves to nothing.
 *
 * The corpus often explains its own silence: every patronyme dossier carries
 * a `gaps[]` array pairing a field path with an editor's sentence saying why
 * that field is empty, on 30 dossiers out of 30. Those paths are written in
 * the same dot-separated space the strict model uses, so a gap note can be
 * matched to the chapter it excuses and printed in place of the generic
 * "Donnée manquante" badge. That is the charter's own request met with prose
 * somebody already wrote.
 *
 * `not-modelled` is what makes this safe to drive a view with: a path the
 * model does not declare is not a silent gap, it is a field that does not
 * exist for this class — the distinction the name fiche lost when it began
 * reading `attestedForms`, a key no model and no dossier has ever carried.
 */
// @req REQ-119
export function resolveChapter(
  entityKind: AfrikEntityKind,
  fieldPath: string,
  declaredValue: unknown,
  gaps: FieldGap[] = [],
  derived?: DerivedFieldInput
): ChapterResolution {
  if (!isStructurallyExpectedField(entityKind, fieldPath)) {
    return { state: "not-modelled" };
  }

  const provenance = classifyFieldProvenance(declaredValue, derived);
  if (provenance.state !== "missing") return provenance;

  const gap = gaps.find((entry) => entry.fieldPath === fieldPath);
  return gap ? { state: "documented-gap", reason: gap.reason } : provenance;
}
