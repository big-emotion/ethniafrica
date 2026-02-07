import { jsonWithCors, corsOptionsResponse } from "@/lib/api/cors";
import { getAllAfrikPeoples } from "@/lib/supabase/queries/afrik/peoples";

export async function GET() {
  try {
    const peoples = await getAllAfrikPeoples();
    return jsonWithCors({
      peoples: peoples.map((p) => ({
        id: p.id,
        name_main: p.nameMain,
        language_family_id: p.languageFamilyId,
      })),
    });
  } catch (error) {
    console.error("Error loading peoples:", error);
    return jsonWithCors({ error: "Failed to load peoples" }, { status: 500 });
  }
}

export function OPTIONS() {
  return corsOptionsResponse();
}
