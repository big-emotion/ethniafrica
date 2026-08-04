import { Suspense } from "react";
import { SectionPageClient } from "./SectionPageClient";

const loadingFallback = (
  <div className="min-h-screen gradient-earth flex items-center justify-center">
    <div className="text-center space-y-4">
      <p className="text-muted-foreground">Chargement...</p>
    </div>
  </div>
);

export default function SectionPage() {
  return (
    <Suspense fallback={loadingFallback}>
      <SectionPageClient />
    </Suspense>
  );
}
