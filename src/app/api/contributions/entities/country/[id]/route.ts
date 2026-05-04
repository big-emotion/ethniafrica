import { NextRequest } from "next/server";
import { jsonWithCors, corsOptionsResponse } from "@/lib/api/cors";
import { getAfrikCountryById } from "@/lib/supabase/queries/afrik/countries";
import { logger } from "@/lib/api/logger";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const country = await getAfrikCountryById(id);
    if (!country) {
      return jsonWithCors({ error: "Country not found" }, { status: 404 });
    }
    return jsonWithCors({
      id: country.id,
      name_fr: country.nameFr,
      etymology: country.etymology || "",
      name_origin_actor: country.nameOriginActor || "",
    });
  } catch (error) {
    logger.error("Error loading country", error);
    return jsonWithCors({ error: "Failed to load country" }, { status: 500 });
  }
}

export function OPTIONS() {
  return corsOptionsResponse();
}
