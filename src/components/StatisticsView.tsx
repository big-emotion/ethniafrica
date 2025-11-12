"use client";

import { useMemo, useState } from 'react';
import { EthnicityData, Language } from '@/types/ethnicity';
import { getTranslation } from '@/lib/translations';
import { Input } from '@/components/ui/input';
import { Search, ChevronUp, ChevronDown } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';

interface StatisticsViewProps {
  data: EthnicityData[];
  language: Language;
}

type SortField = 'country' | 'ethnicity' | 'population' | 'percentageInCountry' | 'percentageInAfrica';
type SortDirection = 'asc' | 'desc';

export const StatisticsView = ({ data, language }: StatisticsViewProps) => {
  const t = getTranslation(language);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>('population');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const itemsPerPage = 20;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const filteredData = useMemo(() => {
    return data
      .filter(row => {
        if (!row.Ethnicity_or_Subgroup || row.Ethnicity_or_Subgroup.includes('sous-groupe')) {
          return false;
        }
        
        const searchLower = search.toLowerCase();
        return (
          row.Country?.toLowerCase().includes(searchLower) ||
          row.Ethnicity_or_Subgroup?.toLowerCase().includes(searchLower)
        );
      })
      .sort((a, b) => {
        let comparison = 0;
        
        switch (sortField) {
          case 'country':
            comparison = (a.Country || '').localeCompare(b.Country || '');
            break;
          case 'ethnicity':
            comparison = (a.Ethnicity_or_Subgroup || '').localeCompare(b.Ethnicity_or_Subgroup || '');
            break;
          case 'population': {
            const popA = parseFloat(a["population de l'ethnie estimée dans le pays"]) || 0;
            const popB = parseFloat(b["population de l'ethnie estimée dans le pays"]) || 0;
            comparison = popA - popB;
            break;
          }
          case 'percentageInCountry': {
            const pctA = parseFloat(a["pourcentage dans la population du pays"]) || 0;
            const pctB = parseFloat(b["pourcentage dans la population du pays"]) || 0;
            comparison = pctA - pctB;
            break;
          }
          case 'percentageInAfrica': {
            const africaA = parseFloat(a["pourcentage dans la population totale d'Afrique"]) || 0;
            const africaB = parseFloat(b["pourcentage dans la population totale d'Afrique"]) || 0;
            comparison = africaA - africaB;
            break;
          }
        }
        
        return sortDirection === 'asc' ? comparison : -comparison;
      });
  }, [data, search, sortField, sortDirection]);

  const SortButton = ({ field, currentField, currentDirection, onSort }: {
    field: SortField;
    currentField: SortField;
    currentDirection: SortDirection;
    onSort: (field: SortField) => void;
  }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-auto p-0 font-normal"
      onClick={() => onSort(field)}
    >
      {currentField === field ? (
        currentDirection === 'asc' ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )
      ) : (
        <div className="h-4 w-4" />
      )}
    </Button>
  );

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const formatNumber = (num: string): string => {
    const parsed = parseFloat(num);
    if (isNaN(parsed)) return '-';
    return new Intl.NumberFormat(language === 'en' ? 'en-US' : language === 'fr' ? 'fr-FR' : language === 'es' ? 'es-ES' : 'pt-PT')
      .format(Math.round(parsed));
  };

  const formatPercent = (pct: string): string => {
    const parsed = parseFloat(pct);
    if (isNaN(parsed)) return '-';
    return `${parsed.toFixed(2)}%`;
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t.searchPlaceholder}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-9"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          {t.showingResults} {Math.min(itemsPerPage, filteredData.length)} {t.of} {filteredData.length} {t.results}
        </div>
      </div>

      <div className="rounded-lg border bg-card shadow-soft">
        <ScrollArea className="h-[calc(100vh-20rem)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">
                  <div className="flex items-center gap-2">
                    {t.country}
                    <SortButton 
                      field="country"
                      currentField={sortField}
                      currentDirection={sortDirection}
                      onSort={handleSort}
                    />
                  </div>
                </TableHead>
                <TableHead className="w-[250px]">
                  <div className="flex items-center gap-2">
                    {t.ethnicity}
                    <SortButton 
                      field="ethnicity"
                      currentField={sortField}
                      currentDirection={sortDirection}
                      onSort={handleSort}
                    />
                  </div>
                </TableHead>
                <TableHead className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {t.population}
                    <SortButton 
                      field="population"
                      currentField={sortField}
                      currentDirection={sortDirection}
                      onSort={handleSort}
                    />
                  </div>
                </TableHead>
                <TableHead className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {t.inCountry}
                    <SortButton 
                      field="percentageInCountry"
                      currentField={sortField}
                      currentDirection={sortDirection}
                      onSort={handleSort}
                    />
                  </div>
                </TableHead>
                <TableHead className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {t.inAfrica}
                    <SortButton 
                      field="percentageInAfrica"
                      currentField={sortField}
                      currentDirection={sortDirection}
                      onSort={handleSort}
                    />
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((row, idx) => (
                <TableRow key={idx} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{row.Country}</TableCell>
                  <TableCell>{row.Ethnicity_or_Subgroup}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(row["population de l'ethnie estimée dans le pays"])}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPercent(row["pourcentage dans la population du pays"])}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPercent(row["pourcentage dans la population totale d'Afrique"])}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-smooth"
          >
            ←
          </button>
          <span className="text-sm text-muted-foreground">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-smooth"
          >
            →
          </button>
        </div>
      )}
    </div>
  );
};
