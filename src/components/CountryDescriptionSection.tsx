"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, History } from "lucide-react";

interface CountryDescriptionSectionProps {
  description?: string;
  ancientNames?: string[];
  language: "en" | "fr" | "es" | "pt";
}

export const CountryDescriptionSection = ({
  description,
  ancientNames,
  language,
}: CountryDescriptionSectionProps) => {
  const t = {
    en: {
      description: "Description",
      ancientNames: "Ancient Names",
    },
    fr: {
      description: "Description",
      ancientNames: "Anciennes appellations",
    },
    es: {
      description: "Descripción",
      ancientNames: "Nombres antiguos",
    },
    pt: {
      description: "Descrição",
      ancientNames: "Nomes antigos",
    },
  }[language];

  if (!description && (!ancientNames || ancientNames.length === 0)) {
    return null;
  }

  return (
    <div className="space-y-6">
      {description && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t.description}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-line">
              {description}
            </p>
          </CardContent>
        </Card>
      )}

      {ancientNames && ancientNames.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              {t.ancientNames}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {ancientNames.map((name, index) => (
                <Badge key={index} variant="outline">
                  {name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
