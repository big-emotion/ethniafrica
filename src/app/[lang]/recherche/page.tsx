import { Suspense } from "react";
import { RecherchePageContent } from "@/components/pages/RecherchePageContent";

// Search pages are dynamic — filters change per request.
export const dynamic = "force-dynamic";

const loadingFallback = (
  <div className="min-h-screen gradient-earth flex items-center justify-center">
    <div className="text-center">
      <p className="text-muted-foreground">Chargement...</p>
    </div>
  </div>
);

export default function RecherchePage() {
  return (
    <Suspense fallback={loadingFallback}>
      <RecherchePageContent />
    </Suspense>
  );
}
