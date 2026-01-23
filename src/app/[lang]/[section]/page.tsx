"use client";

import { Suspense, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getPageFromRoute,
  getLanguageFromRoute,
  getLocalizedRoute,
} from "@/lib/routing";
import { FamillesPageContent } from "@/components/pages/FamillesPageContent";
import { PeuplesPageContent } from "@/components/pages/PeuplesPageContent";
import { PaysPageContentV2 } from "@/components/pages/PaysPageContentV2";
import { Language } from "@/types/ethnicity";

// Redirect component for legacy routes
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
        <p className="text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  );
}

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

  // Legacy routes - redirect to v2 equivalents
  // Regions -> Families (language families is the new primary categorization)
  if (
    section === "regions" ||
    section === "regiones" ||
    section === "regioes"
  ) {
    return <LegacyRedirect to="families" language={language} />;
  }

  // Ethnicities -> Peoples (peoples is the new terminology)
  if (
    section === "ethnicities" ||
    section === "ethnies" ||
    section === "etnias"
  ) {
    return <LegacyRedirect to="peoples" language={language} />;
  }

  // AFRIK v2 routes - Countries
  if (section === "countries" || section === "pays" || section === "paises") {
    return <PaysPageContentV2 />;
  }

  // AFRIK v2 routes - Language Families
  if (
    section === "families" ||
    section === "familles" ||
    section === "familias"
  ) {
    return <FamillesPageContent />;
  }

  // AFRIK v2 routes - Peoples
  if (
    section === "peoples" ||
    section === "peuples" ||
    section === "pueblos" ||
    section === "povos"
  ) {
    return <PeuplesPageContent />;
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
