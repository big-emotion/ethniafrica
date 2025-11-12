"use client";

import { Language } from "@/types/ethnicity";
import { Globe, MapPin, Users } from "lucide-react";

interface DefaultMessageProps {
  language: Language;
  pageType: "regions" | "countries" | "ethnicities";
}

export const DefaultMessage = ({
  language,
  pageType,
}: DefaultMessageProps) => {
  const messages = {
    regions: {
      en: "Select a region from the list to explore its countries, ethnic groups, and demographic data.",
      fr: "Sélectionnez une région dans la liste pour explorer ses pays, groupes ethniques et données démographiques.",
      es: "Seleccione una región de la lista para explorar sus países, grupos étnicos y datos demográficos.",
      pt: "Selecione uma região da lista para explorar seus países, grupos étnicos e dados demográficos.",
    },
    countries: {
      en: "Select a country from the list to discover its ethnic groups, population, and demographic statistics.",
      fr: "Sélectionnez un pays dans la liste pour découvrir ses groupes ethniques, sa population et ses statistiques démographiques.",
      es: "Seleccione un país de la lista para descubrir sus grupos étnicos, población y estadísticas demográficas.",
      pt: "Selecione um país da lista para descobrir seus grupos étnicos, população e estatísticas demográficas.",
    },
    ethnicities: {
      en: "Select an ethnic group from the list to learn about its population, distribution across countries, and demographic information.",
      fr: "Sélectionnez un groupe ethnique dans la liste pour découvrir sa population, sa répartition dans les pays et ses informations démographiques.",
      es: "Seleccione un grupo étnico de la lista para conocer su población, distribución en los países e información demográfica.",
      pt: "Selecione um grupo étnico da lista para conhecer sua população, distribuição nos países e informações demográficas.",
    },
  };

  const icons = {
    regions: Globe,
    countries: MapPin,
    ethnicities: Users,
  };

  const Icon = icons[pageType];
  const message = messages[pageType][language];

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-8 text-center">
      <div className="mb-6">
        <div className="p-4 rounded-full bg-primary/10 inline-flex">
          <Icon className="h-12 w-12 text-primary" />
        </div>
      </div>
      <p className="text-lg text-muted-foreground max-w-md">{message}</p>
    </div>
  );
};

