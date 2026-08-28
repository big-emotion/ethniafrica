"use client";

import Link from "next/link";
import { StateMedallion } from "@/components/ui/StateMedallion";
import type { Language } from "@/types/shared";

/**
 * The locale is fixed rather than read from the route. This page is also the
 * root 404 boundary, and it is reached precisely when the first segment is
 * *not* a locale — `/quiz` used to make `useParams()` hand back
 * `lang = "quiz"`, so the page taught the reader a URL pattern that does not
 * exist and offered a search link to `/quiz/recherche`.
 */
const lang: Language = "fr";

// @req REQ-099
export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center bg-afh-bg-warm px-4 py-12">
      <div className="max-w-xl w-full space-y-6 text-center">
        <StateMedallion className="mx-auto" />

        <h1 className="text-3xl font-display font-semibold text-afh-text">
          Fiche introuvable
        </h1>

        <p data-testid="state-copy" className="text-afh-text-soft">
          Cette page n&apos;existe pas. Les fiches suivent le format{" "}
          <span className="font-mono text-sm bg-afh-bg px-1 rounded">
            /{lang}/peuples/PPL_XXXXX
          </span>
          ,{" "}
          <span className="font-mono text-sm bg-afh-bg px-1 rounded">
            /{lang}/familles/FLG_XXXXX
          </span>{" "}
          ou{" "}
          <span className="font-mono text-sm bg-afh-bg px-1 rounded">
            /{lang}/pays/XXX
          </span>
          .
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            href={`/${lang}/recherche`}
            data-cta="primary"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-md bg-afh-text text-afh-bg-warm text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Rechercher une fiche
          </Link>

          {/* TODO: replace mailto with contribution form once available (ETNI-247) */}
          <a
            href="mailto:contact@ethniafrica.org?subject=URL+cassée"
            className="inline-flex items-center justify-center px-5 py-2.5 text-sm text-afh-text-soft underline underline-offset-2 hover:text-afh-text transition-colors"
          >
            Signaler une URL cassée
          </a>
        </div>
      </div>
    </div>
  );
}
