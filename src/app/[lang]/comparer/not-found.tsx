"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { StateMedallion } from "@/components/ui/StateMedallion";

/**
 * Calm 404 for /[lang]/comparer/[entityType]/[...ids] (UX-DR31, FR62).
 * Explains the comparison URL pattern and links back to the picker —
 * every invalid comparison URL (unknown id, mixed types, duplicate ids,
 * wrong id count) lands here via notFound().
 */
// @req REQ-099
export default function ComparerNotFound() {
  const params = useParams();
  const lang = (params?.lang as string) || "fr";

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center bg-afh-bg-warm px-4 py-12">
      <div className="max-w-xl w-full space-y-6 text-center">
        <StateMedallion className="mx-auto" />

        <h1 className="text-afh-h1 font-display font-semibold text-afh-text">
          Comparaison introuvable
        </h1>

        <p data-testid="state-copy" className="text-afh-text-soft">
          Cette comparaison n&apos;existe pas. Les URLs de comparaison suivent
          le format{" "}
          <span className="font-mono text-afh-small bg-afh-bg px-1 rounded">
            /{lang}/comparer/{"{type}"}/{"{id1}"}/{"{id2}"}
          </span>{" "}
          (2 à 3 identifiants du même type : peuples, pays ou familles
          linguistiques, sans doublon).
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            href={`/${lang}/comparer`}
            data-cta="primary"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-md bg-afh-text text-afh-bg-warm text-afh-small font-medium hover:opacity-90 transition-opacity"
          >
            Commencer une comparaison
          </Link>

          <a
            href="mailto:contact@ethniafrica.org?subject=URL+cassée"
            className="inline-flex items-center justify-center px-5 py-2.5 text-afh-small text-afh-text-soft underline underline-offset-2 hover:text-afh-text transition-colors"
          >
            Signaler une URL cassée
          </a>
        </div>
      </div>
    </div>
  );
}
