/**
 * Internal API route for language families cache
 * Used by services to fetch data with Next.js cache tags
 * This route is not exposed publicly - it's only for internal cache management
 */

import { getAllAfrikLanguageFamilies } from "@/lib/supabase/queries/afrik/languageFamilies";
import { logger } from "@/lib/api/logger";

export async function GET() {
  try {
    const data = await getAllAfrikLanguageFamilies();
    return Response.json(data);
  } catch (error) {
    logger.error("Error in internal language families route", error);
    return Response.json(
      { error: "Failed to fetch language families" },
      { status: 500 }
    );
  }
}
