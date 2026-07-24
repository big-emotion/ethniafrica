/**
 * @swagger
 * /api/v2/flags:
 *   post:
 *     summary: Submit a flag on an AFRIK entity
 *     description: >
 *       Authenticated contributors can flag an entity for editorial review.
 *       Requires the contributor profile to have age confirmation set (FR45, AR24).
 *       Returns 403 AGE_CONFIRMATION_REQUIRED when age_confirmed_at is NULL.
 *     tags: [API v2 - Flags]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FlagCreateInput'
 *     responses:
 *       201:
 *         description: Flag created successfully
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Age confirmation required (FR45)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/auth-server";
import { handleFlagCreate } from "@/api/v2/handlers/flags";
import { createApiError } from "@/api/v2/utils/response";

const FlagSchema = z.object({
  entity_type: z.string().min(1),
  entity_id: z.string().min(1),
  flag_kind: z.enum([
    "inaccurate",
    "missing-source",
    "broken-url",
    "offensive",
    "correction-proposal",
    "other",
  ]),
  reason_text: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      createApiError({
        code: "UNAUTHORIZED",
        message: "Authentication required",
      }),
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      createApiError({
        code: "INVALID_JSON",
        message: "Request body must be valid JSON",
      }),
      { status: 400 }
    );
  }

  const parsed = FlagSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      createApiError({
        code: "VALIDATION_ERROR",
        message: parsed.error.issues.map((i) => i.message).join("; "),
      }),
      { status: 400 }
    );
  }

  const result = await handleFlagCreate(
    user.id,
    parsed.data as {
      entity_type: string;
      entity_id: string;
      flag_kind:
        | "inaccurate"
        | "missing-source"
        | "broken-url"
        | "offensive"
        | "correction-proposal"
        | "other";
      reason_text?: string;
    }
  );

  return NextResponse.json("error" in result ? result.error : result.data, {
    status: result.status,
  });
}
