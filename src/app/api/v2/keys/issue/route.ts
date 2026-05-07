/**
 * @swagger
 * /api/v2/keys/issue:
 *   get:
 *     summary: Issue a public read-only API key
 *     description: |
 *       Issues a shared, IP-bound, read-only public API key.
 *       One key per IP address — returns 409 if a key already exists for this IP.
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
 *       409:
 *         description: A public key already exists for this IP address
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Failed to issue key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
import { NextRequest, NextResponse } from "next/server";
import { hashApiKey, getKeyPrefix } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";

function getClientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get("X-Forwarded-For");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("X-Real-IP") ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const adminClient = createAdminClient();

    // Enforce one public key per IP address
    if (ip) {
      const { data: existing } = await adminClient
        .from("api_keys")
        .select("id")
        .eq("tier", "public")
        .eq("ip_address", ip)
        .eq("active", true)
        .is("revoked_at", null)
        .maybeSingle();

      if (existing) {
        return NextResponse.json(
          {
            error: "key_already_issued",
            message:
              "An active public API key has already been issued for this IP address.",
          },
          { status: 409 }
        );
      }
    }

    const rawKey = `pub_${crypto.randomUUID().replace(/-/g, "")}_${crypto.randomUUID().replace(/-/g, "")}`;
    const keyHash = await hashApiKey(rawKey);
    const keyPrefix = getKeyPrefix(rawKey);

    const { error } = await adminClient.from("api_keys").insert({
      key_hash: keyHash,
      key_prefix: keyPrefix,
      name: "public-key",
      label: "Public read-only key",
      tier: "public",
      active: true,
      ip_address: ip,
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
