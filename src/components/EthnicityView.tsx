"use client";

import { useState, useMemo, useEffect } from 'react';
import { Language } from '@/types/ethnicity';
import { getTranslation } from '@/lib/translations';
import { getAllEthnicities } from '@/lib/datasetLoader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

interface EthnicityViewProps {
  language: Language;
  onEthnicitySelect: (ethnicity: string) => void;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export const EthnicityView = ({ language, onEthnicitySelect }: EthnicityViewProps) => {
  const t = getTranslation(language);
  const [search, setSearch] = useState<string>("");
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [ethnicGroups, setEthnicGroups] = useState<Array<{
    name: string;
    totalPopulation: number;
    percentageInAfrica: number;
    countryCount: number;
  }>>([]);
  const [loading, setLoading] = useState(true);

  const itemsPerPage = 10;

  useEffect(() => {
    getAllEthnicities().then(data => {
      setEthnicGroups(data);
      setLoading(false);
    });
  }, []);

  const filteredGroups = useMemo(() => {
    return ethnicGroups.filter(group => {
      const matchesSearch = group.name.toLowerCase().includes(search.toLowerCase());
      
      if (selectedLetter) {
        // Gérer les noms qui commencent par des guillemets ou caractères spéciaux
        let firstChar = group.name.trim().charAt(0);
        if (firstChar === '"') {
          firstChar = group.name.trim().charAt(1);
        }
        const firstLetter = firstChar.toUpperCase();
        return matchesSearch && firstLetter === selectedLetter;
      }
      
      return matchesSearch;
    });
  }, [ethnicGroups, search, selectedLetter]);

  const paginatedGroups = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredGroups.slice(start, start + itemsPerPage);
  }, [filteredGroups, currentPage]);

  const totalPages = Math.ceil(filteredGroups.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedLetter, search]);

  const availableLetters = useMemo(() => {
    const letters = new Set<string>();
    ethnicGroups.forEach(group => {
      let firstChar = group.name.trim().charAt(0);
      if (firstChar === '"') {
        firstChar = group.name.trim().charAt(1);
      }
      const firstLetter = firstChar.toUpperCase();
      if (/[A-Z]/.test(firstLetter)) {
        letters.add(firstLetter);
      }
    });
    return Array.from(letters).sort();
  }, [ethnicGroups]);

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat(language === 'en' ? 'en-US' : language === 'fr' ? 'fr-FR' : language === 'es' ? 'es-ES' : 'pt-PT')
      .format(Math.round(num));
  };

  const formatPercent = (pct: number): string => {
    return `${pct.toFixed(2)}%`;
  };

  return (
    <div className="space-y-4">
      {/* Navigation alphabétique */}
      <div className="px-4 pt-4">
        <div className="flex flex-wrap gap-1 justify-center">
          <Button
            variant={selectedLetter === null ? "default" : "outline"}
            size="sm"
            className="h-8 w-8 p-0 text-xs"
            onClick={() => setSelectedLetter(null)}
          >
            Tous
          </Button>
          {ALPHABET.map(letter => (
            <Button
              key={letter}
              variant={selectedLetter === letter ? "default" : "outline"}
              size="sm"
              className={`h-8 w-8 p-0 text-xs ${availableLetters.includes(letter) ? '' : 'opacity-30 cursor-not-allowed'}`}
              onClick={() => availableLetters.includes(letter) && setSelectedLetter(letter)}
              disabled={!availableLetters.includes(letter)}
            >
              {letter}
            </Button>
          ))}
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="relative px-4">
        <Search className="absolute left-7 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={t.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Liste des ethnies */}
      <ScrollArea className="h-[calc(100vh-24rem)]">
        <div className="space-y-2 px-4 pb-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">Loading ethnicities...</p>
            </div>
          ) : paginatedGroups.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">No ethnicities found</p>
            </div>
          ) : (
            paginatedGroups.map(group => (
              <Card
                key={group.name}
                className="p-4 hover:shadow-md cursor-pointer transition-all group"
                onClick={() => onEthnicitySelect(group.name)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-base group-hover:text-primary transition-colors mb-2">
                      {group.name}
                    </h3>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t.population}:</span>
                        <span className="font-medium">{formatNumber(group.totalPopulation)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t.inAfrica}:</span>
                        <span className="font-medium">{formatPercent(group.percentageInAfrica)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t.country}:</span>
                        <span className="font-medium">{group.countryCount} {group.countryCount === 1 ? t.country.toLowerCase() : t.countries.toLowerCase()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 px-4 pb-4">
          <Button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            variant="outline"
            size="sm"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {currentPage} / {totalPages}
          </span>
          <Button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            variant="outline"
            size="sm"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
