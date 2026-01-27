/**
 * Internal API route for peoples cache
 * Used by services to fetch data with Next.js cache tags
 * This route is not exposed publicly - it's only for internal cache management
 */

import { getAllAfrikPeoples } from "@/lib/supabase/queries/afrik/peoples";

export async function GET() {
  try {
    const data = await getAllAfrikPeoples();
    return Response.json(data);
  } catch (error) {
    console.error("Error in internal peoples route:", error);
    return Response.json({ error: "Failed to fetch peoples" }, { status: 500 });
  }
}
