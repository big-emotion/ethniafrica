"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { getPageFromRoute, getLanguageFromRoute } from "@/lib/routing";
import { RegionsPageContent } from "@/components/pages/RegionsPageContent";
import { CountriesPageContent } from "@/components/pages/CountriesPageContent";
import { EthnicitiesPageContent } from "@/components/pages/EthnicitiesPageContent";
import { PaysPageContent } from "@/components/pages/PaysPageContent";
import { EthniesPageContent } from "@/components/pages/EthniesPageContent";
import { RegionesPageContent } from "@/components/pages/RegionesPageContent";
import { PaisesPageContent } from "@/components/pages/PaisesPageContent";
import { EtniasPageContent } from "@/components/pages/EtniasPageContent";
import { RegioesPageContent } from "@/components/pages/RegioesPageContent";

function PageContent() {
  const params = useParams();
  const lang = params?.lang as string;
  const section = params?.section as string;

  const pathname = `/${lang}/${section}`;
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

  // Render the appropriate component based on the section
  if (section === "regions" && language === "en") {
    return <RegionsPageContent />;
  }
  if (section === "regions" && language === "fr") {
    return <RegionsPageContent />;
  }
  if (section === "regiones" && language === "es") {
    return <RegionesPageContent />;
  }
  if (section === "regioes" && language === "pt") {
    return <RegioesPageContent />;
  }
  if (section === "countries" && language === "en") {
    return <CountriesPageContent />;
  }
  if (section === "pays" && language === "fr") {
    return <PaysPageContent />;
  }
  if (section === "paises" && (language === "es" || language === "pt")) {
    return language === "es" ? <PaisesPageContent /> : <PaisesPageContent />;
  }
  if (section === "ethnicities" && language === "en") {
    return <EthnicitiesPageContent />;
  }
  if (section === "ethnies" && language === "fr") {
    return <EthniesPageContent />;
  }
  if (section === "etnias" && (language === "es" || language === "pt")) {
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

export default function SectionPage() {
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
