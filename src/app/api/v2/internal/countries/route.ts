/**
 * Internal API route for countries cache
 * Used by services to fetch data with Next.js cache tags
 * This route is not exposed publicly - it's only for internal cache management
 */

import { getAllAfrikCountries } from "@/lib/supabase/queries/afrik/countries";
import { logger } from "@/lib/api/logger";

export async function GET() {
  try {
    const data = await getAllAfrikCountries();
    return Response.json(data);
  } catch (error) {
    logger.error("Error in internal countries route", error);
    return Response.json(
      { error: "Failed to fetch countries" },
      { status: 500 }
    );
  }
}
