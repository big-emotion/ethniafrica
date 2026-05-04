import { NextRequest } from "next/server";
import { jsonWithCors, corsOptionsResponse } from "@/lib/api/cors";
import { getAfrikPeopleById } from "@/lib/supabase/queries/afrik/peoples";
import { logger } from "@/lib/api/logger";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const people = await getAfrikPeopleById(id);
    if (!people) {
      return jsonWithCors({ error: "People not found" }, { status: 404 });
    }
    return jsonWithCors({
      id: people.id,
      name_main: people.nameMain,
      language_family_id: people.languageFamilyId,
      current_countries: people.currentCountries,
    });
  } catch (error) {
    logger.error("Error loading people", error);
    return jsonWithCors({ error: "Failed to load people" }, { status: 500 });
  }
}

export function OPTIONS() {
  return corsOptionsResponse();
}
