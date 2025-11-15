"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

interface CulturalInfoCardProps {
  societyType?: string;
  religion?: string;
  linguisticFamily?: string;
  historicalStatus?: string;
  language: "en" | "fr" | "es" | "pt";
}

export const CulturalInfoCard = ({
  societyType,
  religion,
  linguisticFamily,
  historicalStatus,
  language,
}: CulturalInfoCardProps) => {
  const t = {
    en: {
      title: "Cultural Information",
      societyType: "Society Type",
      religion: "Religion",
      linguisticFamily: "Linguistic Family",
      historicalStatus: "Historical Status",
    },
    fr: {
      title: "Informations culturelles",
      societyType: "Type de société",
      religion: "Religion",
      linguisticFamily: "Famille linguistique",
      historicalStatus: "Statut historique",
    },
    es: {
      title: "Información cultural",
      societyType: "Tipo de sociedad",
      religion: "Religión",
      linguisticFamily: "Familia lingüística",
      historicalStatus: "Estado histórico",
    },
    pt: {
      title: "Informações culturais",
      societyType: "Tipo de sociedade",
      religion: "Religião",
      linguisticFamily: "Família linguística",
      historicalStatus: "Status histórico",
    },
  }[language];

  const hasContent =
    societyType || religion || linguisticFamily || historicalStatus;

  if (!hasContent) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          {t.title}
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
      </CardContent>
    </Card>
  );
};
