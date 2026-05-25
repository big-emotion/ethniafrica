import { Suspense } from "react";
import { SectionPageClient } from "./SectionPageClient";

/**
 * ISR: re-render at most once per hour (AR18).
 * Cache-tag invalidation on moderation commits is handled server-side
 * via `revalidateTag("afrik-data")` in the admin moderation webhook.
 */
export const revalidate = 3600;

const SUPPORTED_SECTIONS = [
  "familles",
  "peuples",
  "pays",
  "recherche",
  // English/Portuguese/Spanish equivalents kept for forward-compat
  "families",
  "peoples",
  "countries",
  "search",
  // Legacy redirects still need a static shell
  "regions",
  "regiones",
  "regioes",
  "ethnicities",
  "ethnies",
  "etnias",
];

export async function generateStaticParams() {
  return SUPPORTED_SECTIONS.map((section) => ({ lang: "fr", section }));
}

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
