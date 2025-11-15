"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, History } from "lucide-react";
import Link from "next/link";
import { getLocalizedRoute } from "@/lib/routing";
import { getCountryKey } from "@/lib/entityKeys";
import { AncientNameEntry } from "@/types/ethnicity";

interface CountryDescriptionSectionProps {
  description?: string;
  ancientNames?: AncientNameEntry[];
  language: "en" | "fr" | "es" | "pt";
  countrySlug?: string; // Pour le lien "Voir plus"
  showAll?: boolean; // Si true, afficher toutes les entrées sans CTA
}

export const CountryDescriptionSection = ({
  description,
  ancientNames,
  language,
  countrySlug,
  showAll = false,
}: CountryDescriptionSectionProps) => {
  const t = {
    en: {
      description: "Description",
      ancientNames: "Ancient Names",
      seeMore: "See more",
    },
    fr: {
      description: "Description",
      ancientNames: "Anciennes appellations",
      seeMore: "Voir plus",
    },
    es: {
      description: "Descripción",
      ancientNames: "Nombres antiguos",
      seeMore: "Ver más",
    },
    pt: {
      description: "Descrição",
      ancientNames: "Nomes antigos",
      seeMore: "Ver mais",
    },
  }[language];

  if (!description && (!ancientNames || ancientNames.length === 0)) {
    return null;
  }

  // Afficher toutes les entrées si showAll est true, sinon seulement les 3 premières
  const displayedEntries = showAll
    ? ancientNames || []
    : ancientNames?.slice(0, 3) || [];
  // Afficher "Voir plus" s'il y a plus de 3 entrées et que showAll est false
  const hasMore = !showAll && ancientNames && ancientNames.length > 3;

  return (
    <div className="space-y-6">
      {description && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {language === "fr"
                ? "Résumé historique"
                : language === "en"
                  ? "Historical Summary"
                  : language === "es"
                    ? "Resumen histórico"
                    : "Resumo histórico"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-line">
              {description}
            </p>
          </CardContent>
        </Card>
      )}

      {displayedEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              {t.ancientNames}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {displayedEntries.map((entry, index) => {
                const namesStr = entry.names.join(", ");
                const isLastEntry = index === displayedEntries.length - 1;
                const shouldShowMore = isLastEntry && hasMore && countrySlug;

                return (
                  <p key={index} className="text-muted-foreground">
                    {entry.period ? `${entry.period} : ${namesStr}` : namesStr}
                    {shouldShowMore && (
                      <>
                        {" ... "}
                        <Link
                          href={`${getLocalizedRoute(language, "countries")}/${encodeURIComponent(countrySlug!)}`}
                          className="text-primary hover:underline"
                        >
                          {t.seeMore}
                        </Link>
                      </>
                    )}
                  </p>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
