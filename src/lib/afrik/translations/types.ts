/**
 * The translation record and its on-disk sidecar, declared once (REQ-142,
 * REQ-146).
 *
 * The database row (`afrik_translations`), the sidecar file under
 * `dataset/translations/<lang>/`, the loader, the validator, the API payload
 * and the reader-facing marker all say the same three words for provenance —
 * `human`, `machine_reviewed`, `machine` — because they read them from here,
 * the way `SourceTier` is read from src/types/sources.ts.
 *
 * A sidecar is the full fiche shape (same keys, same order, invariants
 * verbatim, nulls carried) plus one `_translation` block. It is not a fiche:
 * nothing under dataset/source/afrik walks it, which is why the extra key is
 * allowed there and nowhere else.
 */

import { z } from "zod";

import type { StrictModelFile } from "@/lib/i18n/translationClasses";
import type { TranslationLocale } from "@/lib/i18n/translationLocale";
import type { TranslationKind } from "@/lib/i18n/translationSidecarRules";

export type { TranslationKind };

// @req REQ-142
export const TRANSLATION_KINDS = [
  "human",
  "machine_reviewed",
  "machine",
] as const satisfies readonly TranslationKind[];

// @req REQ-142
export const TRANSLATION_ENTITY_TYPES = [
  "language_family",
  "language",
  "people",
  "country",
  "patronyme",
  "relation",
  "migration",
  "name",
  "onomastic_system",
] as const;

export type TranslationEntityType = (typeof TRANSLATION_ENTITY_TYPES)[number];

/**
 * One corpus directory per entity type. The sidecar tree mirrors the source
 * tree, so this table is what turns a sidecar path back into a table row.
 */
// @req REQ-142
export const ENTITY_TYPE_BY_CORPUS_DIRECTORY: Readonly<
  Record<string, TranslationEntityType>
> = {
  famille_linguistique: "language_family",
  langues: "language",
  peuples: "people",
  pays: "country",
  patronymes: "patronyme",
  relations: "relation",
  migrations: "migration",
  noms: "name",
  systemes_onomastiques: "onomastic_system",
};

const MODEL_BY_ENTITY_TYPE: Readonly<
  Record<Exclude<TranslationEntityType, "onomastic_system">, StrictModelFile>
> = {
  language_family: "modele-linguistique.json",
  language: "modele-langue.json",
  people: "modele-peuple.json",
  country: "modele-pays.json",
  // The four name sub-models are covered by this one plus PARSER_ONLY_LEAVES.
  patronyme: "modele-nom-patronyme.json",
  relation: "modele-relation.json",
  migration: "modele-migration.json",
  name: "modele-nom.json",
};

/** The same subtype table checkNamingSystemModel validates against. */
const NAMING_SYSTEM_MODELS: Readonly<Record<string, StrictModelFile>> = {
  totemic_clan: "modele-nom-totemique.json",
  patronymic_chain: "modele-nom-patronymique.json",
  nisba: "modele-nom-nisba.json",
  jamu: "modele-nom-jamu.json",
};

/**
 * The strict model whose class table governs a record. A naming system is
 * the one entity whose model depends on the record itself.
 */
// @req REQ-142
export function modelForEntity(
  entityType: TranslationEntityType,
  record: Record<string, unknown>
): StrictModelFile {
  if (entityType !== "onomastic_system")
    return MODEL_BY_ENTITY_TYPE[entityType];
  const subtype =
    typeof record.namingSystem === "string" ? record.namingSystem : "";
  return NAMING_SYSTEM_MODELS[subtype] ?? "modele-nom-totemique.json";
}

// @req REQ-142
export const TRANSLATION_BLOCK_KEY = "_translation";

const SHA256_HEX = /^[0-9a-f]{64}$/;
const FIELD_HASH_HEX = /^[0-9a-f]{16}$/;

// @req REQ-142
export const translationBlockSchema = z.object({
  kind: z.enum(TRANSLATION_KINDS),
  translatedAt: z.string().datetime(),
  model: z.string().optional(),
  reviewedBy: z.string().optional(),
  sourceHash: z.string().regex(SHA256_HEX),
  fieldHashes: z.record(z.string(), z.string().regex(FIELD_HASH_HEX)),
  reviewRequired: z.array(z.string()),
});

export type TranslationBlock = z.infer<typeof translationBlockSchema>;

/** A sidecar as read from disk: the translated fiche plus its block. */
export type TranslationSidecar = Record<string, unknown> & {
  [TRANSLATION_BLOCK_KEY]: TranslationBlock;
};

/** The row of `afrik_translations`, in the vocabulary of the code. */
export interface TranslationRecord {
  entityType: TranslationEntityType;
  entityId: string;
  lang: TranslationLocale;
  content: Record<string, unknown>;
  translationKind: TranslationKind;
  translatedAt: string;
  reviewedBy?: string;
  model?: string;
  sourceHash: string;
  fieldHashes: Record<string, string>;
  reviewRequired: string[];
}

/**
 * Separates a sidecar into the translated fiche and its block, keeping the
 * fiche's key order — the key-set comparison against the source relies on it.
 */
// @req REQ-142
export function stripTranslationBlock(sidecar: Record<string, unknown>): {
  block: unknown;
  content: Record<string, unknown>;
} {
  const { [TRANSLATION_BLOCK_KEY]: block, ...content } = sidecar;
  return { block, content };
}
