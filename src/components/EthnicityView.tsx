import { useMemo } from 'react';
import { EthnicityData, Language } from '@/types/ethnicity';
import { getTranslation } from '@/lib/translations';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronRight, Users } from 'lucide-react';

interface EthnicityViewProps {
  data: EthnicityData[];
  language: Language;
  onEthnicitySelect: (ethnicity: string) => void;
}

export const EthnicityView = ({ data, language, onEthnicitySelect }: EthnicityViewProps) => {
  const t = getTranslation(language);
  
  const ethnicGroups = useMemo(() => {
    const groupMap = new Map<string, {
      totalPopulation: number;
      africaPercentage: number;
      countries: Set<string>;
    }>();
    
    data.forEach(row => {
      if (row.Ethnicity_or_Subgroup && !row.Ethnicity_or_Subgroup.includes('sous-groupe') && !row.Ethnicity_or_Subgroup.includes('(sous-groupe)')) {
        const name = row.Ethnicity_or_Subgroup;
        
        if (!groupMap.has(name)) {
          groupMap.set(name, {
            totalPopulation: 0,
            africaPercentage: 0,
            countries: new Set(),
          });
        }
        
        const group = groupMap.get(name)!;
        const pop = parseFloat(row["population de l'ethnie estimée dans le pays"]) || 0;
        const africaPct = parseFloat(row["pourcentage dans la population totale d'Afrique"]) || 0;
        
        group.totalPopulation += pop;
        group.africaPercentage += africaPct;
        if (row.Country) {
          group.countries.add(row.Country);
        }
      }
    });
    
    return Array.from(groupMap.entries())
      .map(([name, info]) => ({
        name,
        totalPopulation: info.totalPopulation,
        africaPercentage: info.africaPercentage,
        countryCount: info.countries.size,
        countries: Array.from(info.countries),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat(language === 'en' ? 'en-US' : language === 'fr' ? 'fr-FR' : language === 'es' ? 'es-ES' : 'pt-PT')
      .format(Math.round(num));
  };

  const formatPercent = (pct: number): string => {
    return `${pct.toFixed(2)}%`;
  };

  return (
    <ScrollArea className="h-[calc(100vh-16rem)]">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
        {ethnicGroups.map(group => (
          <Card
            key={group.name}
            className="p-6 hover:shadow-warm cursor-pointer transition-smooth group"
            onClick={() => onEthnicitySelect(group.name)}
          >
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-lg font-display font-semibold text-foreground group-hover:text-primary transition-smooth flex-1">
                {group.name}
              </h3>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-smooth flex-shrink-0 ml-2" />
            </div>
            
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {group.countryCount} {group.countryCount === 1 ? t.country.toLowerCase() : t.country.toLowerCase() + 's'}
              </span>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t.population}:</span>
                <span className="font-medium">{formatNumber(group.totalPopulation)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t.inAfrica}:</span>
                <span className="font-medium">{formatPercent(group.africaPercentage)}</span>
              </div>
            </div>
            
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex flex-wrap gap-1">
                {group.countries.slice(0, 3).map(country => (
                  <Badge key={country} variant="outline" className="text-xs">
                    {country.length > 12 ? country.substring(0, 12) + '...' : country}
                  </Badge>
                ))}
                {group.countries.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{group.countries.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
};
