import { useMemo } from 'react';
import { EthnicityData, Language } from '@/types/ethnicity';
import { getTranslation } from '@/lib/translations';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronRight } from 'lucide-react';

interface CountryViewProps {
  data: EthnicityData[];
  language: Language;
  onCountrySelect: (country: string) => void;
}

export const CountryView = ({ data, language, onCountrySelect }: CountryViewProps) => {
  const t = getTranslation(language);
  
  const countries = useMemo(() => {
    const countryMap = new Map<string, {
      population: number;
      groupCount: number;
    }>();
    
    data.forEach(row => {
      if (row.Country && !countryMap.has(row.Country)) {
        countryMap.set(row.Country, {
          population: parseFloat(row["population 2025 du pays"]) || 0,
          groupCount: 0,
        });
      }
      if (row.Country && row.Ethnicity_or_Subgroup && !row.Ethnicity_or_Subgroup.includes('sous-groupe')) {
        const country = countryMap.get(row.Country)!;
        country.groupCount++;
      }
    });
    
    return Array.from(countryMap.entries())
      .map(([name, info]) => ({ name, ...info }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

  const getRegion = (countryName: string): string => {
    // Simple region mapping based on file structure
    const northAfrica = ['Algérie', 'Maroc', 'Tunisie', 'Égypte', 'Libye', 'Soudan', 'Mauritanie', 'Sahara occidental'];
    const westAfrica = ['Bénin', 'Burkina Faso', 'Cabo Verde', 'Côte d\'Ivoire', 'Gambie', 'Ghana', 'Guinée', 'Guinée-Bissau', 'Liberia', 'Mali', 'Niger', 'Nigeria', 'Sénégal', 'Sierra Leone', 'Togo'];
    const centralAfrica = ['Cameroun', 'République centrafricaine', 'Tchad', 'Congo (Brazzaville)', 'Congo (RDC)', 'Gabon', 'Guinée équatoriale', 'São Tomé-et-Príncipe'];
    const eastAfrica = ['Burundi', 'Comores', 'Djibouti', 'Érythrée', 'Éthiopie', 'Kenya', 'Madagascar', 'Malawi', 'Maurice', 'Mozambique', 'Ouganda', 'Rwanda', 'Seychelles', 'Somalie', 'Soudan du Sud', 'Tanzanie'];
    
    if (northAfrica.some(c => countryName.includes(c))) return t.northAfrica;
    if (westAfrica.some(c => countryName.includes(c))) return t.westAfrica;
    if (centralAfrica.some(c => countryName.includes(c))) return t.centralAfrica;
    if (eastAfrica.some(c => countryName.includes(c))) return t.eastAfrica;
    return t.southernAfrica;
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat(language === 'en' ? 'en-US' : language === 'fr' ? 'fr-FR' : language === 'es' ? 'es-ES' : 'pt-PT')
      .format(num);
  };

  return (
    <ScrollArea className="h-[calc(100vh-16rem)]">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
        {countries.map(country => (
          <Card
            key={country.name}
            className="p-6 hover:shadow-warm cursor-pointer transition-smooth group"
            onClick={() => onCountrySelect(country.name)}
          >
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-lg font-display font-semibold text-foreground group-hover:text-primary transition-smooth">
                {country.name}
              </h3>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-smooth" />
            </div>
            
            <Badge variant="secondary" className="mb-3">
              {getRegion(country.name)}
            </Badge>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t.population}:</span>
                <span className="font-medium">{formatNumber(country.population)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t.ethnicGroups}:</span>
                <span className="font-medium">{country.groupCount}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
};
