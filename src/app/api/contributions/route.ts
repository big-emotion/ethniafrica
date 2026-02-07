import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { contributionSchema } from "@/lib/validations/contribution";
import { jsonWithCors, corsOptionsResponse } from "@/lib/api/cors";

/**
 * @swagger
 * /api/contributions:
 *   post:
 *     summary: Créer une contribution
 *     description: Permet aux utilisateurs de soumettre une contribution (nouvelle entité ou modification)
 *     tags: [Contributions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - proposed_payload
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [new_people, update_people, new_country, update_country, new_language_family, update_language_family]
 *               proposed_payload:
 *                 type: object
 *                 description: Données proposées (structure flexible selon le type)
 *               contributor_email:
 *                 type: string
 *                 format: email
 *               contributor_name:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Contribution créée avec succès
 *       400:
 *         description: Données invalides
 *       500:
 *         description: Erreur serveur
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Honeypot check (anti-spam)
    if (body.honeypot && body.honeypot !== "") {
      // Bot detected, silently fail
      return jsonWithCors(
        { success: true, message: "Contribution received" },
        { status: 201 }
      );
    }

    // Validate input
    const validationResult = contributionSchema.safeParse(body);
    if (!validationResult.success) {
      return jsonWithCors(
        {
          error: "Invalid input",
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { honeypot: _honeypot, ...contributionData } = validationResult.data;

    // Insert contribution into Supabase
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("contributions")
      .insert({
        type: contributionData.type,
        proposed_payload: contributionData.proposed_payload,
        contributor_email: contributionData.contributor_email || null,
        contributor_name: contributionData.contributor_name || null,
        notes: contributionData.notes || null,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating contribution:", error);
      return jsonWithCors(
        { error: "Failed to create contribution" },
        { status: 500 }
      );
    }

    return jsonWithCors(
      {
        success: true,
        message: "Contribution submitted successfully",
        id: data.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in contributions API:", error);
    return jsonWithCors({ error: "Internal server error" }, { status: 500 });
  }
}

export function OPTIONS() {
  return corsOptionsResponse();
}
