"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Languages } from "lucide-react";

interface TopEthnicitiesCardProps {
  ethnicities: Array<{
    name: string;
    languages: string[];
  }>;
  language: "en" | "fr" | "es" | "pt";
}

export const TopEthnicitiesCard = ({
  ethnicities,
  language,
}: TopEthnicitiesCardProps) => {
  const t = {
    en: {
      title: "Top Ethnicities",
      languages: "Languages",
    },
    fr: {
      title: "Principales ethnies",
      languages: "Langues",
    },
    es: {
      title: "Principales etnias",
      languages: "Idiomas",
    },
    pt: {
      title: "Principais etnias",
      languages: "Idiomas",
    },
  }[language];

  if (ethnicities.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          {t.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {ethnicities.map((ethnicity, index) => (
            <div key={index} className="space-y-2">
              <div className="font-medium">{ethnicity.name}</div>
              {ethnicity.languages.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <Languages className="h-4 w-4 text-muted-foreground mt-0.5" />
                  {ethnicity.languages.map((lang, langIndex) => (
                    <Badge key={langIndex} variant="secondary">
                      {lang}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
