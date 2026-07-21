"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

export default function NotFound() {
  const params = useParams();
  const lang = (params?.lang as string) || "fr";

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center bg-afh-bg-warm px-4 py-12">
      <div className="max-w-xl w-full space-y-6 text-center">
        <h1 className="text-3xl font-display font-semibold text-afh-text">
          Fiche introuvable
        </h1>

        <p className="text-afh-text-soft">
          La page demandée n&apos;existe pas. Les fiches suivent le format{" "}
          <span className="font-mono text-sm bg-afh-bg px-1 rounded">
            /{lang}/peuples/PPL_XXXXX
          </span>{" "}
          pour les peuples,{" "}
          <span className="font-mono text-sm bg-afh-bg px-1 rounded">
            /{lang}/familles/FLG_XXXXX
          </span>{" "}
          pour les familles linguistiques, et{" "}
          <span className="font-mono text-sm bg-afh-bg px-1 rounded">
            /{lang}/pays/XXX
          </span>{" "}
          pour les pays.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            href={`/${lang}/recherche`}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-md bg-afh-text text-afh-bg-warm text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Rechercher une fiche
          </Link>

          {/* TODO: replace mailto with contribution form once available (ETNI-247) */}
          <a
            href="mailto:contact@ethniafrica.org?subject=URL+cassée"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-md border border-afh-border text-afh-text-soft text-sm font-medium hover:bg-afh-bg transition-colors"
          >
            Signaler une URL cassée
          </a>
        </div>
      </div>
    </div>
  );
}
