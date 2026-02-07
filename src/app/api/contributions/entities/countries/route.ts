import { jsonWithCors, corsOptionsResponse } from "@/lib/api/cors";
import { getAllAfrikCountries } from "@/lib/supabase/queries/afrik/countries";

export async function GET() {
  try {
    const countries = await getAllAfrikCountries();
    return jsonWithCors({
      countries: countries.map((c) => ({
        id: c.id,
        name_fr: c.nameFr,
      })),
    });
  } catch (error) {
    console.error("Error loading countries:", error);
    return jsonWithCors({ error: "Failed to load countries" }, { status: 500 });
  }
}

export function OPTIONS() {
  return corsOptionsResponse();
}
