"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Language } from "@/types/ethnicity";
import { getLocalizedRoute } from "@/lib/routing";
import { translations } from "@/lib/translations";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Users } from "lucide-react";

type SectionType = "country" | "region" | "ethnicity";

interface CountryDetailPayload {
  name: string;
  population: number;
  percentageInRegion: number;
  percentageInAfrica: number;
  region: string;
  ethnicities: Array<{
    name: string;
    population: number;
    percentageInCountry: number;
    percentageInRegion: number;
    percentageInAfrica: number;
  }>;
}

interface RegionDetailPayload {
  name: string;
  totalPopulation: number;
  countries: Record<
    string,
    {
      population: number;
      percentageInRegion: number;
      percentageInAfrica: number;
      ethnicityCount: number;
    }
  >;
  ethnicities: Record<
    string,
    {
      totalPopulationInRegion: number;
      percentageInRegion: number;
      percentageInAfrica: number;
    }
  >;
}

interface EthnicityDetailPayload {
  name: string;
  totalPopulation: number;
  percentageInAfrica: number;
  countries: Array<{
    country: string;
    region: string;
    population: number;
    percentageInCountry: number;
    percentageInRegion: number;
    percentageInAfrica: number;
  }>;
}

type DetailData =
  | { type: "country"; payload: CountryDetailPayload }
  | { type: "region"; payload: RegionDetailPayload }
  | { type: "ethnicity"; payload: EthnicityDetailPayload };

const SECTION_LABELS: Record<SectionType, Record<Language, string>> = {
  country: {
    en: "Country",
    fr: "Pays",
    es: "País",
    pt: "País",
  },
  region: {
    en: "Region",
    fr: "Région",
    es: "Región",
    pt: "Região",
  },
  ethnicity: {
    en: "Ethnic Group",
    fr: "Groupe ethnique",
    es: "Grupo étnico",
    pt: "Grupo étnico",
  },
};

const SECTION_BACK_LABELS: Record<SectionType, Record<Language, string>> = {
  country: {
    en: "Back to countries",
    fr: "Retour aux pays",
    es: "Volver a los países",
    pt: "Voltar aos países",
  },
  region: {
    en: "Back to regions",
    fr: "Retour aux régions",
    es: "Volver a las regiones",
    pt: "Voltar às regiões",
  },
  ethnicity: {
    en: "Back to ethnicities",
    fr: "Retour aux ethnies",
    es: "Volver a las etnias",
    pt: "Voltar às etnias",
  },
};

const SECTION_LIST_PAGE: Record<
  SectionType,
  "countries" | "regions" | "ethnicities"
> = {
  country: "countries",
  region: "regions",
  ethnicity: "ethnicities",
};

interface DetailPageClientProps {
  lang: Language;
  sectionType: SectionType;
  sectionSlug: string;
  item: string;
  listHref: string;
  data: DetailData;
}

const formatNumber = (value: number, lang: Language) =>
  new Intl.NumberFormat(
    lang === "en"
      ? "en-US"
      : lang === "fr"
        ? "fr-FR"
        : lang === "es"
          ? "es-ES"
          : "pt-PT"
  ).format(Math.round(value));

const formatPercentage = (value: number, lang: Language) =>
  new Intl.NumberFormat(
    lang === "en"
      ? "en-US"
      : lang === "fr"
        ? "fr-FR"
        : lang === "es"
          ? "es-ES"
          : "pt-PT",
    { minimumFractionDigits: 2, maximumFractionDigits: 2 }
  ).format(value);

export function DetailPageClient({
  lang,
  sectionType,
  sectionSlug,
  item,
  listHref,
  data,
}: DetailPageClientProps) {
  const router = useRouter();
  const [language, setLanguage] = useState<Language>(lang);

  useEffect(() => {
    setLanguage(lang);
  }, [lang]);

  const t = translations[language];

  const itemTitle = useMemo(() => {
    switch (data.type) {
      case "country":
        return data.payload.name;
      case "region":
        return data.payload.name;
      case "ethnicity":
        return data.payload.name;
      default:
        return item;
    }
  }, [data, item]);

  const handleLanguageChange = (nextLang: Language) => {
    if (nextLang === language) return;
    const pageType = SECTION_LIST_PAGE[sectionType];
    const targetSlug = getLocalizedRoute(nextLang, pageType).split("/")[2];
    if (!targetSlug) return;
    setLanguage(nextLang);
    const encodedItem = encodeURIComponent(item);
    router.push(`/${nextLang}/${targetSlug}/${encodedItem}`);
  };

  const SummaryCard = () => {
    if (data.type === "country") {
      const { payload } = data;
      return (
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              {itemTitle}
            </CardTitle>
            <CardDescription>{payload.region}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border bg-card">
              <p className="text-sm text-muted-foreground">
                {t.totalPopulation}
              </p>
              <p className="text-2xl font-semibold">
                {formatNumber(payload.population, language)}
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <p className="text-sm text-muted-foreground">
                {language === "en"
                  ? "Share in Region"
                  : language === "fr"
                    ? "Part dans la région"
                    : language === "es"
                      ? "Participación en la región"
                      : "Participação na região"}
              </p>
              <p className="text-2xl font-semibold">
                {formatPercentage(payload.percentageInRegion, language)}%
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <p className="text-sm text-muted-foreground">
                {language === "en"
                  ? "Share in Africa"
                  : language === "fr"
                    ? "Part en Afrique"
                    : language === "es"
                      ? "Participación en África"
                      : "Participação na África"}
              </p>
              <p className="text-2xl font-semibold">
                {formatPercentage(payload.percentageInAfrica, language)}%
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (data.type === "region") {
      const { payload } = data;
      return (
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              {payload.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border bg-card">
              <p className="text-sm text-muted-foreground">
                {t.totalPopulation}
              </p>
              <p className="text-2xl font-semibold">
                {formatNumber(payload.totalPopulation, language)}
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <p className="text-sm text-muted-foreground">
                {language === "en"
                  ? "Countries in the region"
                  : language === "fr"
                    ? "Pays de la région"
                    : language === "es"
                      ? "Países de la región"
                      : "Países da região"}
              </p>
              <p className="text-2xl font-semibold">
                {Object.keys(payload.countries).length}
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    const { payload } = data;
    return (
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            {payload.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg border bg-card">
            <p className="text-sm text-muted-foreground">{t.totalPopulation}</p>
            <p className="text-2xl font-semibold">
              {formatNumber(payload.totalPopulation, language)}
            </p>
          </div>
          <div className="p-4 rounded-lg border bg-card">
            <p className="text-sm text-muted-foreground">
              {language === "en"
                ? "Share in Africa"
                : language === "fr"
                  ? "Part en Afrique"
                  : language === "es"
                    ? "Participación en África"
                    : "Participação na África"}
            </p>
            <p className="text-2xl font-semibold">
              {formatPercentage(payload.percentageInAfrica, language)}%
            </p>
          </div>
        </CardContent>
      </Card>
    );
  };

  const CountryEthnicitiesTable = ({
    payload,
  }: {
    payload: CountryDetailPayload;
  }) => (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle>
          {language === "en"
            ? "Ethnic composition"
            : language === "fr"
              ? "Composition ethnique"
              : language === "es"
                ? "Composición étnica"
                : "Composição étnica"}
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr className="border-b">
              <th className="py-2 pr-4">{t.ethnicity}</th>
              <th className="py-2 pr-4">{t.population}</th>
              <th className="py-2 pr-4">{t.percentage}</th>
            </tr>
          </thead>
          <tbody>
            {payload.ethnicities.map((ethnicity) => (
              <tr key={ethnicity.name} className="border-b last:border-none">
                <td className="py-2 pr-4 font-medium">{ethnicity.name}</td>
                <td className="py-2 pr-4">
                  {formatNumber(ethnicity.population, language)}
                </td>
                <td className="py-2 pr-4">
                  {formatPercentage(ethnicity.percentageInCountry, language)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );

  const RegionCountriesTable = ({
    payload,
  }: {
    payload: RegionDetailPayload;
  }) => {
    const countries = Object.entries(payload.countries).map(
      ([name, stats]) => ({
        name,
        ...stats,
      })
    );

    return (
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>{t.countries}</CardTitle>
          <CardDescription>
            {language === "en"
              ? "Population and share within the region"
              : language === "fr"
                ? "Population et part dans la région"
                : language === "es"
                  ? "Población y participación en la región"
                  : "População e participação na região"}
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr className="border-b">
                <th className="py-2 pr-4">{t.country}</th>
                <th className="py-2 pr-4">{t.population}</th>
                <th className="py-2 pr-4">
                  {language === "en"
                    ? "In region"
                    : language === "fr"
                      ? "Dans la région"
                      : language === "es"
                        ? "En la región"
                        : "Na região"}
                </th>
                <th className="py-2 pr-4">
                  {language === "en"
                    ? "In Africa"
                    : language === "fr"
                      ? "En Afrique"
                      : language === "es"
                        ? "En África"
                        : "Na África"}
                </th>
              </tr>
            </thead>
            <tbody>
              {countries.map((country) => (
                <tr key={country.name} className="border-b last:border-none">
                  <td className="py-2 pr-4 font-medium">{country.name}</td>
                  <td className="py-2 pr-4">
                    {formatNumber(country.population, language)}
                  </td>
                  <td className="py-2 pr-4">
                    {formatPercentage(country.percentageInRegion, language)}%
                  </td>
                  <td className="py-2 pr-4">
                    {formatPercentage(country.percentageInAfrica, language)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    );
  };

  const RegionEthnicitiesTable = ({
    payload,
  }: {
    payload: RegionDetailPayload;
  }) => {
    const ethnicities = Object.entries(payload.ethnicities).map(
      ([name, stats]) => ({
        name,
        ...stats,
      })
    );

    return (
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>{t.ethnicGroups}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr className="border-b">
                <th className="py-2 pr-4">{t.ethnicity}</th>
                <th className="py-2 pr-4">{t.population}</th>
                <th className="py-2 pr-4">
                  {language === "en"
                    ? "In region"
                    : language === "fr"
                      ? "Dans la région"
                      : language === "es"
                        ? "En la región"
                        : "Na região"}
                </th>
                <th className="py-2 pr-4">
                  {language === "en"
                    ? "In Africa"
                    : language === "fr"
                      ? "En Afrique"
                      : language === "es"
                        ? "En África"
                        : "Na África"}
                </th>
              </tr>
            </thead>
            <tbody>
              {ethnicities.map((ethnicity) => (
                <tr key={ethnicity.name} className="border-b last:border-none">
                  <td className="py-2 pr-4 font-medium">{ethnicity.name}</td>
                  <td className="py-2 pr-4">
                    {formatNumber(ethnicity.totalPopulationInRegion, language)}
                  </td>
                  <td className="py-2 pr-4">
                    {formatPercentage(ethnicity.percentageInRegion, language)}%
                  </td>
                  <td className="py-2 pr-4">
                    {formatPercentage(ethnicity.percentageInAfrica, language)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    );
  };

  const EthnicityCountriesTable = ({
    payload,
  }: {
    payload: EthnicityDetailPayload;
  }) => (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle>{t.countries}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr className="border-b">
              <th className="py-2 pr-4">{t.country}</th>
              <th className="py-2 pr-4">{t.region}</th>
              <th className="py-2 pr-4">{t.population}</th>
              <th className="py-2 pr-4">{t.percentage}</th>
            </tr>
          </thead>
          <tbody>
            {payload.countries.map((country) => (
              <tr
                key={`${country.country}-${country.region}`}
                className="border-b last:border-none"
              >
                <td className="py-2 pr-4 font-medium">{country.country}</td>
                <td className="py-2 pr-4">
                  <Badge variant="secondary">{country.region}</Badge>
                </td>
                <td className="py-2 pr-4">
                  {formatNumber(country.population, language)}
                </td>
                <td className="py-2 pr-4">
                  {formatPercentage(country.percentageInCountry, language)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen gradient-earth">
      <header className="border-b bg-card shadow-soft">
        <div className="container mx-auto px-4 py-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              {SECTION_LABELS[sectionType][language]}
            </p>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
              {itemTitle}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {(["en", "fr", "es", "pt"] as Language[]).map((locale) => (
              <Button
                key={locale}
                size="sm"
                variant={locale === language ? "default" : "outline"}
                onClick={() => handleLanguageChange(locale)}
              >
                {locale.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Button
            variant="ghost"
            className="gap-2"
            onClick={() => router.push(listHref)}
          >
            <ArrowLeft className="h-4 w-4" />
            {SECTION_BACK_LABELS[sectionType][language]}
          </Button>

          <Link href={`/${language}`}>
            <Button variant="ghost">
              {language === "en"
                ? "Back to home"
                : language === "fr"
                  ? "Retour à l'accueil"
                  : language === "es"
                    ? "Volver al inicio"
                    : "Voltar à página inicial"}
            </Button>
          </Link>
        </div>

        <SummaryCard />

        {data.type === "country" && (
          <CountryEthnicitiesTable payload={data.payload} />
        )}

        {data.type === "region" && (
          <div className="space-y-6">
            <RegionCountriesTable payload={data.payload} />
            <RegionEthnicitiesTable payload={data.payload} />
          </div>
        )}

        {data.type === "ethnicity" && (
          <EthnicityCountriesTable payload={data.payload} />
        )}
      </main>
    </div>
  );
}
