"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Globe, Users, BookOpen, MapPin } from "lucide-react";

interface EthnicityDescriptionSectionProps {
  description?: string;
  societyType?: string;
  religion?: string;
  linguisticFamily?: string;
  historicalStatus?: string;
  regionalPresence?: string;
  languages?: Array<{ name: string; isPrimary: boolean }>;
  sources?: string[];
  language: "en" | "fr" | "es" | "pt";
}

export const EthnicityDescriptionSection = ({
  description,
  societyType,
  religion,
  linguisticFamily,
  historicalStatus,
  regionalPresence,
  languages,
  sources,
  language,
}: EthnicityDescriptionSectionProps) => {
  const t = {
    en: {
      description: "Description",
      societyType: "Society Type",
      religion: "Religion",
      linguisticFamily: "Linguistic Family",
      historicalStatus: "Historical Status",
      regionalPresence: "Regional Presence",
      languages: "Languages",
      sources: "Sources",
      primary: "Primary",
    },
    fr: {
      description: "Description",
      societyType: "Type de société",
      religion: "Religion",
      linguisticFamily: "Famille linguistique",
      historicalStatus: "Statut historique",
      regionalPresence: "Présence régionale",
      languages: "Langues",
      sources: "Sources",
      primary: "Principale",
    },
    es: {
      description: "Descripción",
      societyType: "Tipo de sociedad",
      religion: "Religión",
      linguisticFamily: "Familia lingüística",
      historicalStatus: "Estado histórico",
      regionalPresence: "Presencia regional",
      languages: "Idiomas",
      sources: "Fuentes",
      primary: "Principal",
    },
    pt: {
      description: "Descrição",
      societyType: "Tipo de sociedade",
      religion: "Religião",
      linguisticFamily: "Família linguística",
      historicalStatus: "Status histórico",
      regionalPresence: "Presença regional",
      languages: "Idiomas",
      sources: "Fontes",
      primary: "Principal",
    },
  }[language];

  const hasContent =
    description ||
    societyType ||
    religion ||
    linguisticFamily ||
    historicalStatus ||
    regionalPresence ||
    (languages && languages.length > 0) ||
    (sources && sources.length > 0);

  if (!hasContent) return null;

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

      {(societyType ||
        religion ||
        linguisticFamily ||
        historicalStatus ||
        regionalPresence) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {language === "en"
                ? "Cultural Information"
                : language === "fr"
                  ? "Informations culturelles"
                  : language === "es"
                    ? "Información cultural"
                    : "Informações culturais"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {societyType && (
              <div>
                <p className="text-sm font-medium mb-1">{t.societyType}</p>
                <p className="text-muted-foreground">{societyType}</p>
              </div>
            )}
            {religion && (
              <div>
                <p className="text-sm font-medium mb-1">{t.religion}</p>
                <p className="text-muted-foreground">{religion}</p>
              </div>
            )}
            {linguisticFamily && (
              <div>
                <p className="text-sm font-medium mb-1">{t.linguisticFamily}</p>
                <p className="text-muted-foreground">{linguisticFamily}</p>
              </div>
            )}
            {historicalStatus && (
              <div>
                <p className="text-sm font-medium mb-1">{t.historicalStatus}</p>
                <p className="text-muted-foreground">{historicalStatus}</p>
              </div>
            )}
            {regionalPresence && (
              <div>
                <p className="text-sm font-medium mb-1">{t.regionalPresence}</p>
                <div className="flex flex-wrap gap-2">
                  {regionalPresence.split(",").map((presence, index) => (
                    <Badge key={index} variant="secondary">
                      <MapPin className="h-3 w-3 mr-1" />
                      {presence.trim()}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {languages && languages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              {t.languages}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {languages.map((lang, index) => (
                <Badge
                  key={index}
                  variant={lang.isPrimary ? "default" : "secondary"}
                >
                  {lang.name}
                  {lang.isPrimary && (
                    <span className="ml-1 text-xs">({t.primary})</span>
                  )}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {sources && sources.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              {t.sources}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1">
              {sources.map((source, index) => (
                <li key={index} className="text-muted-foreground">
                  {source}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
