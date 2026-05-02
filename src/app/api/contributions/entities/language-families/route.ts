import { jsonWithCors, corsOptionsResponse } from "@/lib/api/cors";
import { getAllAfrikLanguageFamilies } from "@/lib/supabase/queries/afrik/languageFamilies";

export async function GET() {
  try {
    const families = await getAllAfrikLanguageFamilies();
    return jsonWithCors({
      families: families.map((f) => ({
        id: f.id,
        name_fr: f.nameFr,
        name_en: f.nameEn || "",
      })),
    });
  } catch (error) {
    console.error("Error loading language families:", error);
    return jsonWithCors(
      { error: "Failed to load language families" },
      { status: 500 }
    );
  }
}

export function OPTIONS() {
  return corsOptionsResponse();
}
