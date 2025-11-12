import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { getPageFromRoute, getLanguageFromRoute } from "@/lib/routing";
import { loadDatasetIndex } from "@/lib/datasetLoader";

export const runtime = "nodejs";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function OgImage(
  req: NextRequest,
  { params }: { params: Promise<{ lang: string; slug: string }> }
) {
  const resolvedParams = await params;
  const { searchParams } = new URL(req.url);
  const pageType = getPageFromRoute(`/${resolvedParams.lang}/${resolvedParams.slug}`);
  const language = getLanguageFromRoute(`/${resolvedParams.lang}/${resolvedParams.slug}`) || "en";
  
  let title = "African Ethnicities Dictionary";
  let subtitle = "Explore ethnic groups across 55 African countries";
  let name = "";

  // Get the selected item from query params
  if (pageType === "regions" && searchParams.get("region")) {
    const regionKey = searchParams.get("region") || "";
    // Try to get the region name from the dataset
    try {
      const index = await loadDatasetIndex();
      const region = index.regions[regionKey];
      name = region ? region.name : regionKey;
    } catch {
      name = regionKey;
    }
    title = name;
    subtitle = language === "en" 
      ? "Region details and statistics"
      : language === "fr"
      ? "Détails et statistiques de la région"
      : language === "es"
      ? "Detalles y estadísticas de la región"
      : "Detalhes e estatísticas da região";
  } else if (pageType === "countries" && searchParams.get("country")) {
    name = searchParams.get("country") || "";
    title = name;
    subtitle = language === "en"
      ? "Country demographics and ethnic groups"
      : language === "fr"
      ? "Démographie et groupes ethniques du pays"
      : language === "es"
      ? "Demografía y grupos étnicos del país"
      : "Demografia e grupos étnicos do país";
  } else if (pageType === "ethnicities" && searchParams.get("ethnicity")) {
    name = searchParams.get("ethnicity") || "";
    title = name;
    subtitle = language === "en"
      ? "Ethnic group information and distribution"
      : language === "fr"
      ? "Informations et distribution du groupe ethnique"
      : language === "es"
      ? "Información y distribución del grupo étnico"
      : "Informações e distribuição do grupo étnico";
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 35%, #111827 100%)",
          color: "white",
          padding: "48px",
        }}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: 999,
              background: "#FBBF24",
            }}
          />
          <div style={{ fontSize: 20, opacity: 0.9 }}>
            Dictionnaire des Ethnies d'Afrique
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{
              fontSize: name ? 64 : 72,
              fontWeight: 800,
              letterSpacing: -1,
            }}
          >
            {title}
          </div>
          <div style={{ fontSize: 28, opacity: 0.9 }}>{subtitle}</div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 22,
            opacity: 0.9,
          }}
        >
          <div>ethniafrique-atlas.vercel.app</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ fontWeight: 900, color: "#FBBF24" }}>BIG</div>
            <div style={{ fontWeight: 900 }}>EMOTION</div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}

