import { NextRequest } from "next/server";
import { revalidateTag, revalidatePath } from "next/cache";
import { logger } from "@/lib/api/logger";
import { revalidatePayloadSchema } from "./schema";

// Live cache config keyed by entity_type
const LIVE_CACHE_CONFIG: Record<string, { tag: string; path: string }> = {
  people: { tag: "afrik-peoples", path: "/fr/peuples" },
  language_family: { tag: "afrik-language-families", path: "/fr/familles" },
  language: { tag: "afrik-language-families", path: "/fr/familles" },
  country: { tag: "afrik-countries", path: "/fr/pays" },
};

// Stable-reference endpoint tags (AR18: s-maxage=86400) — always invalidated
const STABLE_REF_TAGS = ["afrik-language-families", "afrik-countries"] as const;

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.SUPABASE_WEBHOOK_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = revalidatePayloadSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return Response.json(
      {
        error: "VALIDATION_ERROR",
        message: issue?.message ?? "Invalid payload",
      },
      { status: 400 }
    );
  }

  const { entity_type, entity_id, slug } = parsed.data;
  const invalidatedTags: string[] = [];
  const invalidatedPaths: string[] = [];

  // Invalidate the live fiche cache for this entity type
  const liveConfig = LIVE_CACHE_CONFIG[entity_type];
  if (liveConfig) {
    revalidateTag(liveConfig.tag, "max");
    invalidatedTags.push(liveConfig.tag);
    revalidatePath(liveConfig.path);
    invalidatedPaths.push(liveConfig.path);
  }

  // Always invalidate stable-reference endpoint tags (AR18)
  for (const tag of STABLE_REF_TAGS) {
    if (!invalidatedTags.includes(tag)) {
      revalidateTag(tag, "max");
      invalidatedTags.push(tag);
    }
  }

  logger.info("Cache invalidated via /api/internal/revalidate", {
    entity_type,
    entity_id,
    slug,
    tags: invalidatedTags,
    paths: invalidatedPaths,
  });

  return Response.json({
    success: true,
    invalidated: { tags: invalidatedTags, paths: invalidatedPaths },
  });
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
    },
  });
}
