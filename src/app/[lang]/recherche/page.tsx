import { Suspense } from "react";
import { RecherchePageContent } from "@/components/pages/RecherchePageContent";
import { LoadingState } from "@/components/ui/LoadingState";

// Search pages are dynamic — filters change per request.
export const dynamic = "force-dynamic";

export default function RecherchePage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <RecherchePageContent />
    </Suspense>
  );
}
