import { NextRequest } from "next/server";
import { jsonWithCors, corsOptionsResponse } from "@/lib/api/cors";
import { getAfrikLanguageFamilyById } from "@/lib/supabase/queries/afrik/languageFamilies";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const family = await getAfrikLanguageFamilyById(id);
    if (!family) {
      return jsonWithCors(
        { error: "Language family not found" },
        { status: 404 }
      );
    }
    return jsonWithCors({
      id: family.id,
      name_fr: family.nameFr,
      name_en: family.nameEn || "",
    });
  } catch (error) {
    console.error("Error loading language family:", error);
    return jsonWithCors(
      { error: "Failed to load language family" },
      { status: 500 }
    );
  }
}

export function OPTIONS() {
  return corsOptionsResponse();
}
