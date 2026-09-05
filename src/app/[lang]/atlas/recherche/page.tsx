import type { Metadata } from "next";
import { Suspense } from "react";
import { RecherchePageContent } from "@/components/pages/RecherchePageContent";
import { DidYouKnowLoader } from "@/components/system/DidYouKnowLoader";
import { pickDidYouKnowFact } from "@/lib/home/didYouKnowFacts";
import { getLocalizedRoute } from "@/lib/routing";
import { surfaceHead } from "@/lib/seo/localeAlternates";
import { getTranslation } from "@/lib/translations";
import type { Language } from "@/types/shared";

// Search pages are dynamic — filters change per request.
// @req REQ-002
export const dynamic = "force-dynamic";

// The canonical is the bare search page: a query is a reading of it, never
// a page of its own, so a crawler is told about one address.
// @req REQ-141
export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const title = getTranslation(lang as Language).trail.pages.search;
  return {
    title,
    ...surfaceHead(
      lang as Language,
      "search",
      (locale) => getLocalizedRoute(locale, "search"),
      { title }
    ),
  };
}

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
