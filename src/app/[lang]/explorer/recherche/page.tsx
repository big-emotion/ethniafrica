import { Suspense } from "react";
import { RecherchePageContent } from "@/components/pages/RecherchePageContent";
import { DidYouKnowLoader } from "@/components/system/DidYouKnowLoader";
import { pickDidYouKnowFact } from "@/lib/home/didYouKnowFacts";

// Search pages are dynamic — filters change per request.
// @req REQ-002
export const dynamic = "force-dynamic";

// @req REQ-002
// @req REQ-104
export default function RecherchePage() {
  return (
    /**
     * This boundary wraps the whole page, so its fallback is what a reader
     * actually waits on here — not an in-page placeholder. Showing a skeleton
     * would hand this one route a second, different wait right after the
     * route's own interstitial has just been taken down.
     *
     * The accent scope is load-bearing: outside a .afh-accent-* wrapper,
     * --accent resolves to shadcn's bare HSL triplet and the inked continent
     * renders black.
     */
    <Suspense
      fallback={
        <div className="afh-accent-ocre">
          <DidYouKnowLoader
            fact={pickDidYouKnowFact()}
            label="Chargement de la recherche"
          />
        </div>
      }
    >
      <RecherchePageContent />
    </Suspense>
  );
}
