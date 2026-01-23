"use client";

import { useState, useEffect } from "react";
import { Search, Users, MapPin, Loader2, Languages } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Language } from "@/types/ethnicity";
import { getTranslation } from "@/lib/translations";
import { search } from "@/lib/afrikLoader";
import type { SearchResult, SearchEntityType } from "@/types/afrik-frontend";

interface SearchModalV2Props {
  open: boolean;
  onClose: () => void;
  language: Language;
  onResultSelect: (result: {
    type: SearchEntityType;
    id: string;
    name: string;
  }) => void;
}

export const SearchModalV2 = ({
  open,
  onClose,
  language,
  onResultSelect,
}: SearchModalV2Props) => {
  const t = getTranslation(language);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<SearchEntityType | "all">("all");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setResults([]);
      setActiveTab("all");
    }
  }, [open]);

  useEffect(() => {
    const searchData = async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const searchFilters: { type?: SearchEntityType } =
          activeTab !== "all" ? { type: activeTab } : {};
        const data = await search(searchQuery, searchFilters);
        setResults(data);
      } catch (error) {
        console.error("Search error:", error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(searchData, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, activeTab]);

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat(
      language === "en"
        ? "en-US"
        : language === "fr"
          ? "fr-FR"
          : language === "es"
            ? "es-ES"
            : "pt-PT"
    ).format(Math.round(num));
  };

  const handleResultClick = (result: SearchResult) => {
    onResultSelect({
      type: result.type,
      id: result.id,
      name: result.name,
    });
    onClose();
    setSearchQuery("");
  };

  const getTabLabels = () => {
    switch (language) {
      case "en":
        return {
          all: "All",
          families: "Families",
          peoples: "Peoples",
          countries: "Countries",
        };
      case "es":
        return {
          all: "Todo",
          families: "Familias",
          peoples: "Pueblos",
          countries: "Países",
        };
      case "pt":
        return {
          all: "Tudo",
          families: "Famílias",
          peoples: "Povos",
          countries: "Países",
        };
      default:
        return {
          all: "Tout",
          families: "Familles",
          peoples: "Peuples",
          countries: "Pays",
        };
    }
  };

  const getResultTypeLabel = (type: SearchEntityType) => {
    switch (language) {
      case "en":
        switch (type) {
          case "languageFamily":
            return "Language Family";
          case "people":
            return "People";
          case "country":
            return "Country";
          case "language":
            return "Language";
          default:
            return type;
        }
      case "es":
        switch (type) {
          case "languageFamily":
            return "Familia lingüística";
          case "people":
            return "Pueblo";
          case "country":
            return "País";
          case "language":
            return "Idioma";
          default:
            return type;
        }
      case "pt":
        switch (type) {
          case "languageFamily":
            return "Família linguística";
          case "people":
            return "Povo";
          case "country":
            return "País";
          case "language":
            return "Língua";
          default:
            return type;
        }
      default:
        switch (type) {
          case "languageFamily":
            return "Famille linguistique";
          case "people":
            return "Peuple";
          case "country":
            return "Pays";
          case "language":
            return "Langue";
          default:
            return type;
        }
    }
  };

  const getResultIcon = (type: SearchEntityType) => {
    switch (type) {
      case "languageFamily":
        return <Languages className="h-5 w-5 text-primary" />;
      case "people":
        return <Users className="h-5 w-5 text-primary" />;
      case "country":
        return <MapPin className="h-5 w-5 text-primary" />;
      case "language":
        return <Languages className="h-5 w-5 text-primary" />;
      default:
        return <Search className="h-5 w-5 text-primary" />;
    }
  };

  const tabLabels = getTabLabels();

  const dialogTitle =
    language === "en"
      ? "Search"
      : language === "fr"
        ? "Recherche"
        : language === "es"
          ? "Búsqueda"
          : "Pesquisa";

  const getPlaceholder = () => {
    switch (language) {
      case "en":
        return "Search for a family, people, or country...";
      case "es":
        return "Buscar una familia, pueblo o país...";
      case "pt":
        return "Pesquisar uma família, povo ou país...";
      default:
        return "Rechercher une famille, un peuple ou un pays...";
    }
  };

  const getNoResultsText = () => {
    if (!searchQuery.trim()) {
      switch (language) {
        case "en":
          return "Start typing to search...";
        case "es":
          return "Comience a escribir para buscar...";
        case "pt":
          return "Comece a digitar para pesquisar...";
        default:
          return "Commencez à taper pour rechercher...";
      }
    }
    if (searchQuery.length < 2) {
      switch (language) {
        case "en":
          return "Type at least 2 characters...";
        case "es":
          return "Escriba al menos 2 caracteres...";
        case "pt":
          return "Digite pelo menos 2 caracteres...";
        default:
          return "Tapez au moins 2 caractères...";
      }
    }
    switch (language) {
      case "en":
        return "No results found";
      case "es":
        return "No se encontraron resultados";
      case "pt":
        return "Nenhum resultado encontrado";
      default:
        return "Aucun résultat trouvé";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-[80vh] p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-xl font-semibold">
            {dialogTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pt-4 pb-2 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder={getPlaceholder()}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>

          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as SearchEntityType | "all")}
          >
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="all">{tabLabels.all}</TabsTrigger>
              <TabsTrigger value="languageFamily">
                {tabLabels.families}
              </TabsTrigger>
              <TabsTrigger value="people">{tabLabels.peoples}</TabsTrigger>
              <TabsTrigger value="country">{tabLabels.countries}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <ScrollArea className="flex-1 px-6 pb-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Search className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <p className="text-muted-foreground">{getNoResultsText()}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {results.map((result, index) => (
                <Card
                  key={`${result.type}-${result.id}-${index}`}
                  className="p-4 hover:shadow-md cursor-pointer transition-all"
                  onClick={() => handleResultClick(result)}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">{getResultIcon(result.type)}</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base mb-1">
                        {result.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge variant="secondary" className="text-xs">
                          {getResultTypeLabel(result.type)}
                        </Badge>
                        {result.languageFamilyName && (
                          <Badge variant="outline" className="text-xs">
                            {result.languageFamilyName}
                          </Badge>
                        )}
                      </div>
                      {result.snippet && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {result.snippet}
                        </p>
                      )}
                      {result.population !== undefined && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {t.population}: {formatNumber(result.population)}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
