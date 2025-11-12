"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { getPageFromRoute, getLanguageFromRoute } from "@/lib/routing";
import { RegionsPageContent } from "@/app/regions/RegionsPageContent";
import { CountriesPageContent } from "@/app/countries/CountriesPageContent";
import { EthnicitiesPageContent } from "@/app/ethnicities/EthnicitiesPageContent";
import { PaysPageContent } from "@/app/pays/PaysPageContent";
import { EthniesPageContent } from "@/app/ethnies/EthniesPageContent";
import { RegionesPageContent } from "@/app/regiones/RegionesPageContent";
import { PaisesPageContent } from "@/app/paises/PaisesPageContent";
import { EtniasPageContent } from "@/app/etnias/EtniasPageContent";
import { RegioesPageContent } from "@/app/regioes/RegioesPageContent";

function PageContent() {
  const params = useParams();
  const lang = params?.lang as string;
  const slug = params?.slug as string;
  
  const pathname = `/${lang}/${slug}`;
  const pageType = getPageFromRoute(pathname);
  const language = getLanguageFromRoute(pathname);

  if (!pageType || !language) {
    return (
      <div className="min-h-screen gradient-earth flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Page not found</p>
        </div>
      </div>
    );
  }

  // Render the appropriate component based on the slug
  if (slug === "regions" && language === "en") {
    return <RegionsPageContent />;
  }
  if (slug === "regions" && language === "fr") {
    return <RegionsPageContent />;
  }
  if (slug === "regiones" && language === "es") {
    return <RegionesPageContent />;
  }
  if (slug === "regioes" && language === "pt") {
    return <RegioesPageContent />;
  }
  if (slug === "countries" && language === "en") {
    return <CountriesPageContent />;
  }
  if (slug === "pays" && language === "fr") {
    return <PaysPageContent />;
  }
  if (slug === "paises" && (language === "es" || language === "pt")) {
    return language === "es" ? <PaisesPageContent /> : <PaisesPageContent />;
  }
  if (slug === "ethnicities" && language === "en") {
    return <EthnicitiesPageContent />;
  }
  if (slug === "ethnies" && language === "fr") {
    return <EthniesPageContent />;
  }
  if (slug === "etnias" && (language === "es" || language === "pt")) {
    return language === "es" ? <EtniasPageContent /> : <EtniasPageContent />;
  }

  return (
    <div className="min-h-screen gradient-earth flex items-center justify-center">
      <div className="text-center space-y-4">
        <p className="text-muted-foreground">Page not found</p>
      </div>
    </div>
  );
}

export default function SlugPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen gradient-earth flex items-center justify-center">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <PageContent />
    </Suspense>
  );
}

