"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getPageFromRoute,
  getLanguageFromRoute,
  getLocalizedRoute,
} from "@/lib/routing";
import { FamillesPageContent } from "@/components/pages/FamillesPageContent";
import { PeuplesPageContent } from "@/components/pages/PeuplesPageContent";
import { PaysPageContentV2 } from "@/components/pages/PaysPageContentV2";
import { SearchPageContent } from "@/components/pages/SearchPageContent";
import { Language } from "@/types/shared";

function LegacyRedirect({
  to,
  language,
}: {
  to: "families" | "peoples" | "countries";
  language: Language;
}) {
  const router = useRouter();

  useEffect(() => {
    const newRoute = getLocalizedRoute(language, to);
    router.replace(newRoute);
  }, [language, to, router]);

  return (
    <div className="min-h-screen gradient-earth flex items-center justify-center">
      <div className="text-center space-y-4">
        <p className="text-muted-foreground">Redirection...</p>
      </div>
    </div>
  );
}

export function SectionPageClient() {
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
          <p className="text-muted-foreground">Page non trouvée</p>
        </div>
      </div>
    );
  }

  if (
    section === "regions" ||
    section === "regiones" ||
    section === "regioes"
  ) {
    return <LegacyRedirect to="families" language={language} />;
  }

  if (
    section === "ethnicities" ||
    section === "ethnies" ||
    section === "etnias"
  ) {
    return <LegacyRedirect to="peoples" language={language} />;
  }

  if (section === "countries" || section === "pays") {
    return <PaysPageContentV2 />;
  }

  if (section === "families" || section === "familles") {
    return <FamillesPageContent />;
  }

  if (section === "peoples" || section === "peuples") {
    return <PeuplesPageContent />;
  }

  if (section === "search" || section === "recherche") {
    return <SearchPageContent />;
  }

  return (
    <div className="min-h-screen gradient-earth flex items-center justify-center">
      <div className="text-center space-y-4">
        <p className="text-muted-foreground">Page non trouvée</p>
      </div>
    </div>
  );
}
