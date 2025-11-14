"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Languages } from "lucide-react";

interface TopLanguagesCardProps {
  languages: string[];
  language: "en" | "fr" | "es" | "pt";
}

export const TopLanguagesCard = ({
  languages,
  language,
}: TopLanguagesCardProps) => {
  const t = {
    en: {
      title: "Top Languages",
    },
    fr: {
      title: "Principales langues",
    },
    es: {
      title: "Principales idiomas",
    },
    pt: {
      title: "Principais idiomas",
    },
  }[language];

  if (languages.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Languages className="h-5 w-5" />
          {t.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {languages.map((lang, index) => (
            <Badge key={index} variant="secondary">
              {lang}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
