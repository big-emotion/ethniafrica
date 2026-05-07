/**
 * @swagger
 * /api/v2/keys/issue:
 *   get:
 *     summary: Issue a public read-only API key
 *     description: |
 *       Returns a shared, read-only public API key.
 *       Public keys are rate-limited and can only perform read operations.
 *       Partner and admin keys must be requested via the admin UI.
 *       No authentication required for this endpoint.
 *     tags:
 *       - API v2 - Keys
 *     security: []
 *     responses:
 *       201:
 *         description: Public key issued successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 key:
 *                   type: string
 *                   description: Raw API key (shown only once)
 *                 tier:
 *                   type: string
 *                   example: public
 *                 note:
 *                   type: string
 *       500:
 *         description: Failed to issue key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
import { NextResponse } from "next/server";
import { hashApiKey } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    // Generate a random raw key
    const rawKey = `pub_${crypto.randomUUID().replace(/-/g, "")}_${crypto.randomUUID().replace(/-/g, "")}`;
    const keyHash = await hashApiKey(rawKey);

    const adminClient = createAdminClient();
    const { error } = await adminClient.from("api_keys").insert({
      key_hash: keyHash,
      name: "public-key",
      label: "Public read-only key",
      tier: "public",
      active: true,
    });

    if (error) {
      return NextResponse.json(
        { error: "failed_to_issue_key" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        key: rawKey,
        tier: "public",
        note: "Store this key safely. It will not be shown again.",
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "failed_to_issue_key" }, { status: 500 });
  }
}
