import { useMemo, useState } from 'react';
import { EthnicityData, Language } from '@/types/ethnicity';
import { getTranslation } from '@/lib/translations';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

interface StatisticsViewProps {
  data: EthnicityData[];
  language: Language;
}

export const StatisticsView = ({ data, language }: StatisticsViewProps) => {
  const t = getTranslation(language);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

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
        const popA = parseFloat(a["population de l'ethnie estimée dans le pays"]) || 0;
        const popB = parseFloat(b["population de l'ethnie estimée dans le pays"]) || 0;
        return popB - popA;
      });
  }, [data, search]);

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
                <TableHead className="w-[200px]">{t.country}</TableHead>
                <TableHead className="w-[250px]">{t.ethnicity}</TableHead>
                <TableHead className="text-right">{t.population}</TableHead>
                <TableHead className="text-right">{t.inCountry}</TableHead>
                <TableHead className="text-right">{t.inAfrica}</TableHead>
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
