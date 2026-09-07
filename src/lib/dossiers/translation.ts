import { classOf } from "@/lib/i18n/translationClasses";
import { createHash } from "node:crypto";
import { parseDossierFile } from "@/lib/afrik/parsers/dossierParser";
import type { Dossier } from "@/lib/afrik/parsers/dossierTypes";
import {
  recordLeaves,
  formatSegments,
  valueAt,
} from "@/lib/i18n/modelLeafPaths";
import { sidecarViolations } from "@/lib/i18n/translationSidecarRules";
import { z } from "zod";

const provenanceSchema = z.object({
  kind: z.enum(["machine", "machine_reviewed", "human"]),
  translatedAt: z.string().min(1),
  model: z.string().min(1),
  sourceHash: z.string(),
  fieldHashes: z.record(z.string(), z.string()),
  reviewRequired: z.array(z.string()).length(0),
});
const hash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

// @req REQ-143
export function applyDossierTranslation(
  source: Dossier,
  raw: unknown
): Dossier | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const { _translation, ...overlay } = raw as Record<string, unknown>;
  const meta = provenanceSchema.safeParse(_translation);
  if (!meta.success || meta.data.sourceHash !== hash(source)) return null;
  if (
    sidecarViolations({
      model: "modele-dossier.json",
      source,
      sidecar: overlay,
      translationKind: meta.data.kind,
    }).length
  )
    return null;
  // The page labels the whole narrative as English. Partial prose would need
  // per-field language markers, so an incomplete translation falls back to French.
  if (
    recordLeaves(source).some(
      (leaf) =>
        classOf("modele-dossier.json", leaf.modelPath) === "translatable" &&
        typeof leaf.value === "string" &&
        typeof valueAt(overlay, leaf.segments) !== "string"
    )
  )
    return null;
  const translated = structuredClone(source);
  for (const leaf of recordLeaves(overlay)) {
    const original = valueAt(source, leaf.segments);
    if (
      original === undefined ||
      meta.data.fieldHashes[formatSegments(leaf.segments)] !== hash(original)
    )
      return null;
    let parent: Record<string | number, unknown> =
      translated as unknown as Record<string, unknown>;
    for (const segment of leaf.segments.slice(0, -1)) {
      if (!parent[segment] || typeof parent[segment] !== "object") return null;
      parent = parent[segment] as Record<string | number, unknown>;
    }
    parent[leaf.segments[leaf.segments.length - 1]] = leaf.value;
  }
  return parseDossierFile(translated).data ?? null;
}
