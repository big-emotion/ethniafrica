"use server";

import "server-only";

import { revisionSchema } from "@/api/v2/schemas/revisions";
import { logger } from "@/lib/api/logger";
import { getCountryRoute, getFamilyRoute, getPeopleRoute } from "@/lib/routing";
import { createServerSupabaseClient } from "@/lib/supabase/auth-server";

const publishedRevisionSchema = revisionSchema
  .pick({
    id: true,
    entity_type: true,
    entity_id: true,
    version: true,
    snapshot_jsonb: true,
  })
  .extend({
    entity_type: revisionSchema.shape.entity_type.refine(
      (value) =>
        value === "people" ||
        value === "country" ||
        value === "language_family" ||
        value === "language",
      "Unsupported revision entity type"
    ),
  });

type PublishRevisionFailureCode =
  "invalid_draft_id" | "invalid_reason" | "publication_failed";

type PublicationRoutes = {
  liveUrl: string;
  pinnedUrl: string;
};

// @req REQ-016
export type PublishRevisionResult =
  | {
      success: true;
      revisionId: string;
      version: number;
      liveUrl: string | null;
      pinnedUrl: string | null;
    }
  | {
      success: false;
      code: PublishRevisionFailureCode;
      message: string;
    };

const INVALID_DRAFT_RESULT: PublishRevisionResult = {
  success: false,
  code: "invalid_draft_id",
  message: "Le brouillon à publier est invalide.",
};

const INVALID_REASON_RESULT: PublishRevisionResult = {
  success: false,
  code: "invalid_reason",
  message: "Le motif de publication doit contenir entre 50 et 500 caractères.",
};

const PUBLICATION_FAILED_RESULT: PublishRevisionResult = {
  success: false,
  code: "publication_failed",
  message: "La publication a échoué. Veuillez réessayer.",
};

function derivePublicationRoutes(
  entityType: string,
  entityId: string,
  version: number
): PublicationRoutes | null {
  const pinnedId = `${entityId}@v${version}`;

  switch (entityType) {
    case "people":
      return {
        liveUrl: getPeopleRoute("fr", entityId),
        pinnedUrl: getPeopleRoute("fr", pinnedId),
      };
    case "country":
      return {
        liveUrl: getCountryRoute("fr", entityId),
        pinnedUrl: getCountryRoute("fr", pinnedId),
      };
    case "language_family":
      return {
        liveUrl: getFamilyRoute("fr", entityId),
        pinnedUrl: getFamilyRoute("fr", pinnedId),
      };
    default:
      return null;
  }
}

// @req REQ-016
export async function publishRevision(
  draftId: string,
  reason: string
): Promise<PublishRevisionResult> {
  if (!revisionSchema.shape.id.safeParse(draftId).success) {
    return INVALID_DRAFT_RESULT;
  }

  const trimmedReason = reason.trim();
  const reasonLength = Array.from(trimmedReason).length;
  if (reasonLength < 50 || reasonLength > 500) {
    return INVALID_REASON_RESULT;
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.rpc("publish_revision", {
      p_draft_id: draftId,
      p_reason: trimmedReason,
    });

    if (error) {
      logger.error("Failed to publish revision", error, { draftId });
      return PUBLICATION_FAILED_RESULT;
    }

    const parsedRevision = publishedRevisionSchema.safeParse(data);
    if (!parsedRevision.success) {
      logger.error("Failed to publish revision", parsedRevision.error, {
        draftId,
      });
      return PUBLICATION_FAILED_RESULT;
    }

    const revision = parsedRevision.data;
    const routes = derivePublicationRoutes(
      revision.entity_type,
      revision.entity_id,
      revision.version
    );

    return {
      success: true,
      revisionId: revision.id,
      version: revision.version,
      liveUrl: routes?.liveUrl ?? null,
      pinnedUrl: routes?.pinnedUrl ?? null,
    };
  } catch (error) {
    logger.error("Failed to publish revision", error, { draftId });
    return PUBLICATION_FAILED_RESULT;
  }
}
