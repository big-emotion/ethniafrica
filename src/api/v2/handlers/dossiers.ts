import {
  publicDossierSchema,
  publicDossierSummarySchema,
  type PublicDossier,
  type PublicDossierSummary,
} from "@/api/v2/schemas/dossiers";
import {
  getDossierById,
  listDossierSummaries,
} from "@/api/v2/services/dossiers";
import { createApiResponse, type ApiEnvelope } from "@/api/v2/utils/response";
import type { DossierVertical } from "@/lib/afrik/parsers/dossierTypes";

export type DossierHandlerResult =
  | { ok: true; envelope: ApiEnvelope<PublicDossier> }
  | { ok: false; code: "NOT_FOUND"; message: string };

// @req REQ-114
export async function getDossierHandler(
  id: string
): Promise<DossierHandlerResult> {
  const record = await getDossierById(id);

  if (!record) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: `Dossier not found: ${id}`,
    };
  }

  const dossier = publicDossierSchema.parse({
    id: record.id,
    vertical: record.vertical,
    slug: record.slug,
    publishedOn: record.publishedOn,
    ...record.content,
  });

  return { ok: true, envelope: createApiResponse(dossier) };
}

// @req REQ-114
export async function listDossiersHandler(
  vertical?: DossierVertical
): Promise<ApiEnvelope<PublicDossierSummary[]>> {
  const summaries = await listDossierSummaries(vertical);
  const parsed = summaries.map((summary) =>
    publicDossierSummarySchema.parse(summary)
  );

  // No pagination meta: the listing is the editorial index of an axis, which is
  // a handful of rows by construction and not a corpus dump. `noUnpaginatedDumps`
  // guards the entity endpoints that can grow to hundreds; this one cannot.
  return createApiResponse(parsed);
}
