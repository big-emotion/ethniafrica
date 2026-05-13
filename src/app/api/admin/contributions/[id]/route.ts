import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonWithCors, corsOptionsResponse } from "@/lib/api/cors";
import { isAdminAuthenticated } from "@/lib/auth/admin";
import { logger } from "@/lib/api/logger";
import { auditLog } from "@/lib/audit/log";

/**
 * Route API admin pour accepter/rejeter une contribution
 *
 * @swagger
 * /api/admin/contributions/{id}:
 *   patch:
 *     summary: Accepter ou rejeter une contribution
 *     description: Route admin pour modérer les contributions
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [approve, reject]
 *               moderator_notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contribution modérée avec succès
 *       400:
 *         description: Action invalide
 *       404:
 *         description: Contribution non trouvée
 *       500:
 *         description: Erreur serveur
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // Vérifier l'authentification
    const authenticated = await isAdminAuthenticated();
    if (!authenticated) {
      return jsonWithCors({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, moderator_notes } = body;

    if (!action || !["approve", "reject"].includes(action)) {
      return jsonWithCors(
        { error: "Invalid action. Must be 'approve' or 'reject'" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Capture pre-update state for the audit_log "before" snapshot. We
    // tolerate a null response: the subsequent UPDATE will surface a 404
    // (PGRST116) if the row does not exist.
    const { data: previous } = await supabase
      .from("contributions")
      .select()
      .eq("id", id)
      .single();

    // Update contribution status
    const status = action === "approve" ? "approved" : "rejected";
    const { data, error } = await supabase
      .from("contributions")
      .update({
        status,
        moderator_notes: moderator_notes || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      logger.error("Error updating contribution", error);
      if (error.code === "PGRST116") {
        return jsonWithCors(
          { error: "Contribution not found" },
          { status: 404 }
        );
      }
      return jsonWithCors(
        { error: "Failed to update contribution" },
        { status: 500 }
      );
    }

    // If approved, merge the contribution into the official tables
    if (action === "approve" && data) {
      try {
        await mergeContribution(data);
      } catch (mergeError) {
        logger.error("Error merging contribution", mergeError);
        // Rollback status update
        await supabase
          .from("contributions")
          .update({ status: "pending" })
          .eq("id", id);
        return jsonWithCors(
          {
            error: "Failed to merge contribution",
            details:
              mergeError instanceof Error
                ? mergeError.message
                : String(mergeError),
          },
          { status: 500 }
        );
      }
    }

    // Emit audit_log entry only after the mutation (and any merge) succeeds.
    // The helper swallows its own failures so this can never break the
    // response.
    await auditLog.write({
      actorId: null,
      action:
        action === "approve" ? "contribution.approve" : "contribution.reject",
      targetType: "contribution",
      targetId: id,
      before: previous ?? undefined,
      after: data ?? undefined,
      ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: request.headers.get("user-agent") ?? null,
    });

    return jsonWithCors({
      success: true,
      message: `Contribution ${action}d successfully`,
      contribution: data,
    });
  } catch (error) {
    logger.error("Error in admin contributions API", error);
    return jsonWithCors({ error: "Internal server error" }, { status: 500 });
  }
}

interface Contribution {
  type: string;
  proposed_payload: Record<string, unknown>;
}

/**
 * Merge a contribution into the official AFRIK tables
 */
async function mergeContribution(contribution: Contribution) {
  const supabase = createAdminClient();
  const { type, proposed_payload } = contribution;

  switch (type) {
    case "new_people":
      await supabase.from("afrik_peuples").insert(proposed_payload);
      break;
    case "update_people":
      await supabase
        .from("afrik_peuples")
        .update(proposed_payload)
        .eq("id", proposed_payload.id);
      break;
    case "new_country":
      await supabase.from("afrik_pays").insert(proposed_payload);
      break;
    case "update_country":
      await supabase
        .from("afrik_pays")
        .update(proposed_payload)
        .eq("id", proposed_payload.id);
      break;
    case "new_language_family":
      await supabase
        .from("afrik_familles_linguistiques")
        .insert(proposed_payload);
      break;
    case "update_language_family":
      await supabase
        .from("afrik_familles_linguistiques")
        .update(proposed_payload)
        .eq("id", proposed_payload.id);
      break;
    default:
      throw new Error(`Unknown contribution type: ${type}`);
  }
}

export function OPTIONS() {
  return corsOptionsResponse();
}
