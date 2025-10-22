import { useState, useMemo } from "react";
import { EthnicityData, Language } from "@/types/ethnicity";
import { getTranslation } from "@/lib/translations";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";

interface CountryViewProps {
  data: EthnicityData[];
  language: Language;
  onCountrySelect: (country: string) => void;
  onEthnicitySelect: (ethnicity: string) => void;
}

type ViewMode = "alphabet" | "countries" | "ethnicities";

export const CountryView = ({
  data,
  language,
  onCountrySelect,
  onEthnicitySelect,
}: CountryViewProps) => {
  const t = getTranslation(language);
  const [viewMode, setViewMode] = useState<ViewMode>("alphabet");
  const [selectedLetter, setSelectedLetter] = useState<string>("");
  const [selectedCountry, setSelectedCountry] = useState<string>("");

  // Obtenir les lettres de l'alphabet qui ont des pays
  const availableLetters = useMemo(() => {
    const letters = new Set<string>();
    data.forEach((row) => {
      if (row.Country) {
        letters.add(row.Country.charAt(0).toUpperCase());
      }
    });
    return Array.from(letters).sort();
  }, [data]);

  // Obtenir les pays par lettre
  const countriesByLetter = useMemo(() => {
    const countryMap = new Map<
      string,
      {
        population: number;
        groupCount: number;
      }
    >();

    data.forEach((row) => {
      if (row.Country && !countryMap.has(row.Country)) {
        countryMap.set(row.Country, {
          population: parseFloat(row["population 2025 du pays"]) || 0,
          groupCount: 0,
        });
      }
      if (
        row.Country &&
        row.Ethnicity_or_Subgroup &&
        !row.Ethnicity_or_Subgroup.includes("sous-groupe")
      ) {
        const country = countryMap.get(row.Country)!;
        country.groupCount++;
      }
    });

    return Array.from(countryMap.entries())
      .map(([name, info]) => ({ name, ...info }))
      .filter((country) => country.name.startsWith(selectedLetter))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data, selectedLetter]);

  // Obtenir les ethnies d'un pays
  const ethnicitiesByCountry = useMemo(() => {
    const ethnicities = new Set<string>();
    data.forEach((row) => {
      if (
        row.Country === selectedCountry &&
        row.Ethnicity_or_Subgroup &&
        !row.Ethnicity_or_Subgroup.includes("sous-groupe")
      ) {
        ethnicities.add(row.Ethnicity_or_Subgroup);
      }
    });
    return Array.from(ethnicities).sort();
  }, [data, selectedCountry]);

  const getRegion = (countryName: string): string => {
    // Simple region mapping based on file structure
    const northAfrica = [
      "Algérie",
      "Maroc",
      "Tunisie",
      "Égypte",
      "Libye",
      "Soudan",
      "Mauritanie",
      "Sahara occidental",
    ];
    const westAfrica = [
      "Bénin",
      "Burkina Faso",
      "Cabo Verde",
      "Côte d'Ivoire",
      "Gambie",
      "Ghana",
      "Guinée",
      "Guinée-Bissau",
      "Liberia",
      "Mali",
      "Niger",
      "Nigeria",
      "Sénégal",
      "Sierra Leone",
      "Togo",
    ];
    const centralAfrica = [
      "Cameroun",
      "République centrafricaine",
      "Tchad",
      "Congo (Brazzaville)",
      "Congo (RDC)",
      "Gabon",
      "Guinée équatoriale",
      "São Tomé-et-Príncipe",
    ];
    const eastAfrica = [
      "Burundi",
      "Comores",
      "Djibouti",
      "Érythrée",
      "Éthiopie",
      "Kenya",
      "Madagascar",
      "Malawi",
      "Maurice",
      "Mozambique",
      "Ouganda",
      "Rwanda",
      "Seychelles",
      "Somalie",
      "Soudan du Sud",
      "Tanzanie",
    ];

    if (northAfrica.some((c) => countryName.includes(c))) return t.northAfrica;
    if (westAfrica.some((c) => countryName.includes(c))) return t.westAfrica;
    if (centralAfrica.some((c) => countryName.includes(c)))
      return t.centralAfrica;
    if (eastAfrica.some((c) => countryName.includes(c))) return t.eastAfrica;
    return t.southernAfrica;
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat(
      language === "en"
        ? "en-US"
        : language === "fr"
        ? "fr-FR"
        : language === "es"
        ? "es-ES"
        : "pt-PT"
    ).format(num);
  };

  const handleLetterClick = (letter: string) => {
    setSelectedLetter(letter);
    setViewMode("countries");
  };

  const handleCountryClick = (country: string) => {
    setSelectedCountry(country);
    setViewMode("ethnicities");
    onCountrySelect(country);
  };

  const handleEthnicityClick = (ethnicity: string) => {
    onEthnicitySelect(ethnicity);
  };

  const handleBackToAlphabet = () => {
    setViewMode("alphabet");
    setSelectedLetter("");
    setSelectedCountry("");
  };

  const handleBackToCountries = () => {
    setViewMode("countries");
    setSelectedCountry("");
  };

  const renderAlphabetView = () => (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Sélectionnez une lettre</h2>
      <div className="grid grid-cols-5 gap-3">
        {availableLetters.map((letter) => (
          <Button
            key={letter}
            variant="outline"
            className="h-12 text-lg font-semibold hover:bg-primary hover:text-primary-foreground"
            onClick={() => handleLetterClick(letter)}
          >
            {letter}
          </Button>
        ))}
      </div>
    </div>
  );

  const renderCountriesView = () => (
    <div className="p-4">
      <div className="flex items-center gap-4 mb-4">
        <Button variant="ghost" size="sm" onClick={handleBackToAlphabet}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Retour
        </Button>
        <h2 className="text-xl font-semibold">
          Pays commençant par "{selectedLetter}"
        </h2>
      </div>
      <div className="grid grid-cols-5 gap-3">
        {countriesByLetter.map((country) => (
          <Card
            key={country.name}
            className="p-4 hover:shadow-md cursor-pointer transition-all group"
            onClick={() => handleCountryClick(country.name)}
          >
            <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">
              {country.name}
            </h3>
            <Badge variant="secondary" className="mt-2 text-xs">
              {getRegion(country.name)}
            </Badge>
            <div className="mt-2 text-xs text-muted-foreground">
              <div>{formatNumber(country.population)} hab.</div>
              <div>{country.groupCount} ethnies</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderEthnicitiesView = () => (
    <div className="p-4">
      <div className="flex items-center gap-4 mb-4">
        <Button variant="ghost" size="sm" onClick={handleBackToCountries}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Retour
        </Button>
        <h2 className="text-xl font-semibold">Ethnies de {selectedCountry}</h2>
      </div>

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="ethnicities">
          <AccordionTrigger className="text-lg">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {ethnicitiesByCountry.length} ethnies
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-1 gap-2 pt-4">
              {ethnicitiesByCountry.map((ethnicity) => (
                <Button
                  key={ethnicity}
                  variant="ghost"
                  className="justify-start h-auto p-3 hover:bg-primary hover:text-primary-foreground"
                  onClick={() => handleEthnicityClick(ethnicity)}
                >
                  {ethnicity}
                </Button>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );

  return (
    <ScrollArea className="h-[calc(100vh-16rem)]">
      {viewMode === "alphabet" && renderAlphabetView()}
      {viewMode === "countries" && renderCountriesView()}
      {viewMode === "ethnicities" && renderEthnicitiesView()}
    </ScrollArea>
  );
};
