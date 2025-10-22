import { useState, useEffect } from "react";
import { Language, ViewMode, EthnicityData } from "@/types/ethnicity";
import { getTranslation } from "@/lib/translations";
import { loadAllCSVData } from "@/lib/csvLoader";
import { LanguageSelector } from "@/components/LanguageSelector";
import { AfricaMap } from "@/components/AfricaMap";
import { CountryView } from "@/components/CountryView";
import { EthnicityView } from "@/components/EthnicityView";
import { StatisticsView } from "@/components/StatisticsView";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

const Index = () => {
  const [language, setLanguage] = useState<Language>("en");
  const [viewMode, setViewMode] = useState<ViewMode>("country");
  const [data, setData] = useState<EthnicityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedEthnicity, setSelectedEthnicity] = useState<string | null>(
    null
  );

  const t = getTranslation(language);

  useEffect(() => {
    loadAllCSVData().then((csvData) => {
      setData(csvData);
      setLoading(false);
    });
  }, []);

  const handleCountrySelect = (country: string) => {
    setSelectedItem(country);
    setSelectedCountry(country);
  };

  const handleEthnicitySelect = (ethnicity: string) => {
    setSelectedItem(ethnicity);
    setSelectedEthnicity(ethnicity);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-earth">
      {/* Header */}
      <header className="border-b bg-card shadow-soft">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1
                className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2 bg-clip-text text-transparent gradient-warm"
                style={{
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {t.title}
              </h1>
              <p className="text-sm md:text-base text-muted-foreground">
                {t.subtitle}
              </p>
            </div>
            <LanguageSelector
              currentLang={language}
              onLanguageChange={setLanguage}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Map Section */}
          <Card className="lg:col-span-1 p-6 shadow-soft">
            <h2 className="text-xl font-display font-semibold mb-4 text-foreground">
              Africa
            </h2>
            <AfricaMap
              highlightedCountries={selectedItem ? [selectedItem] : []}
              selectedEthnicity={selectedEthnicity}
              selectedCountry={selectedCountry}
              data={data}
              className="h-96"
            />
            {selectedItem && (
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium text-foreground">
                  {selectedItem}
                </p>
                <button
                  onClick={() => {
                    setSelectedItem(null);
                    setSelectedCountry(null);
                    setSelectedEthnicity(null);
                  }}
                  className="mt-2 text-xs text-primary hover:underline"
                >
                  {t.close}
                </button>
              </div>
            )}
          </Card>

          {/* Data Section */}
          <div className="lg:col-span-2">
            <Tabs
              value={viewMode}
              onValueChange={(v) => setViewMode(v as ViewMode)}
            >
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="country">{t.byCountry}</TabsTrigger>
                <TabsTrigger value="ethnicity">{t.byEthnicity}</TabsTrigger>
                <TabsTrigger value="statistics">{t.statistics}</TabsTrigger>
              </TabsList>

              <TabsContent value="country" className="mt-0">
                <Card className="shadow-soft">
                  <CountryView
                    data={data}
                    language={language}
                    onCountrySelect={handleCountrySelect}
                    onEthnicitySelect={handleEthnicitySelect}
                  />
                </Card>
              </TabsContent>

              <TabsContent value="ethnicity" className="mt-0">
                <Card className="shadow-soft">
                  <EthnicityView
                    data={data}
                    language={language}
                    onEthnicitySelect={handleEthnicitySelect}
                  />
                </Card>
              </TabsContent>

              <TabsContent value="statistics" className="mt-0">
                <Card className="shadow-soft">
                  <StatisticsView data={data} language={language} />
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>
            © 2025 African Ethnicities Dictionary | Data sources: Official
            demographic estimates 2025
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
