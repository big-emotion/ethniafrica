"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Language } from "@/types/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle } from "lucide-react";
import type { CountryDetail } from "@/types/afrik-frontend";
import { getCountry } from "@/lib/afrikLoader";
import { transformCountryData } from "@/lib/countryDataTransformer";
import { AfrikBreadcrumbs } from "@/components/layout/AfrikBreadcrumbs";
import { hasActiveSourceFlag } from "@/lib/flags-client";
import {
  CountryHero,
  EtymologyBlock,
  OriginBanner,
  HistoryTimeline,
  PeoplesSection,
  KingdomsSection,
  HistoricalFactsSection,
  LanguagesSection,
  CultureGrid,
  SourcesFooter,
} from "@/components/country";

interface CountryDetailViewV2Props {
  countryId: string;
  language: Language;
  onPeopleClick?: (peopleId: string) => void;
  onBack?: () => void;
}

export const CountryDetailViewV2 = ({
  countryId,
  language,
  onBack,
}: CountryDetailViewV2Props) => {
  const searchParams = useSearchParams();
  const fromPeopleName = searchParams.get("fromPeopleName");
  const fromPeopleId = searchParams.get("fromPeopleId");

  const [country, setCountry] = useState<CountryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sourceFlag, setSourceFlag] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const loadCountry = async () => {
      try {
        const data = await getCountry(countryId);
        if (!cancelled) {
          if (data) {
            setCountry(data);
          } else {
            setError(getNotFoundText());
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Error fetching country:", err);
          setError(getErrorText());
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadCountry();

    // Story 0.20 (FR31): "source à vérifier" badge si flag actif.
    hasActiveSourceFlag("country", countryId).then((flag) => {
      if (!cancelled) setSourceFlag(flag);
    });

    return () => {
      cancelled = true;
    };
  }, [countryId, language]);

  const getNotFoundText = (): string => {
    return "Pays non trouvé";
  };

  const getErrorText = (): string => {
    return "Échec du chargement du pays";
  };

  if (loading) {
    return (
      <div className="w-full">
        <div className="mx-3 md:mx-4 xl:mx-5 mt-3 rounded-[20px] overflow-hidden">
          <Skeleton className="h-[280px] w-full" />
        </div>
        <div className="px-3 md:px-4 xl:px-5 space-y-3 mt-3">
          <Skeleton className="h-[160px] w-full rounded-[16px]" />
          <Skeleton className="h-[200px] w-full rounded-[16px]" />
          <Skeleton className="h-[300px] w-full rounded-[16px]" />
        </div>
      </div>
    );
  }

  if (error || !country) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-3 p-6">
        <AlertTriangle className="h-10 w-10 text-destructive" />
        <p className="text-destructive text-sm font-medium">
          {error || getNotFoundText()}
        </p>
      </div>
    );
  }

  const data = transformCountryData(country);

  const getBackLabel = () => {
    return "Retour";
  };

  const breadcrumbs = [
    ...(fromPeopleId
      ? [
          { label: "Peuples", href: "/fr/peuples" },
          {
            label: fromPeopleName ?? fromPeopleId,
            href: `/fr/peuples/${fromPeopleId}`,
          },
        ]
      : [{ label: "Pays", href: "/fr/pays" }]),
    { label: country.nameFr },
  ];

  return (
    <div
      className="w-full pb-3 md:pb-4 xl:pb-5"
      style={{
        fontFamily: "var(--country-font-body)",
        color: "var(--country-text)",
      }}
    >
      {/* 1. Hero */}
      <CountryHero
        data={data.hero}
        onBack={onBack}
        backLabel={getBackLabel()}
      />

      {/* Breadcrumbs — below hero */}
      <AfrikBreadcrumbs items={breadcrumbs} />

      {/* Content area */}
      <div className="px-3 md:px-4 xl:px-5 space-y-[10px] md:space-y-[14px] xl:space-y-4">
        {/* 2. Etymology + Origin */}
        {(data.etymology || data.origin) && (
          <section
            className="country-fade-in rounded-[var(--country-radius-xl)] md:rounded-[20px] xl:rounded-[22px] p-[18px] md:p-6 xl:p-7 relative overflow-hidden"
            style={{
              background: "var(--country-card)",
              border: "1px solid var(--country-border)",
              animationDelay: "0ms",
            }}
          >
            <div
              className="flex items-center gap-[6px] text-[10px] md:text-[11px] font-extrabold uppercase tracking-[0.14em] mb-[14px] md:mb-[18px]"
              style={{ color: "var(--country-text-soft)" }}
            >
              <span
                className="w-5 h-5 rounded-[var(--country-radius-md)] flex items-center justify-center text-[11px]"
                style={{
                  background: "var(--country-gold-bg)",
                  color: "var(--country-gold)",
                }}
              >
                ✦
              </span>
              Étymologie du nom
            </div>

            <div className="block md:grid md:grid-cols-2 md:gap-4 md:items-start">
              {data.etymology && <EtymologyBlock data={data.etymology} />}
              {data.origin && <OriginBanner data={data.origin} />}
            </div>
          </section>
        )}

        {/* 3. Timeline */}
        {data.timeline.items.length > 0 && (
          <section
            className="country-fade-in rounded-[var(--country-radius-xl)] md:rounded-[20px] xl:rounded-[22px] p-[18px] md:p-6 xl:p-7 relative overflow-hidden"
            style={{
              background: "var(--country-card)",
              border: "1px solid var(--country-border)",
              animationDelay: "50ms",
            }}
          >
            <div
              className="flex items-center gap-[6px] text-[10px] md:text-[11px] font-extrabold uppercase tracking-[0.14em] mb-[14px] md:mb-[18px]"
              style={{ color: "var(--country-text-soft)" }}
            >
              <span
                className="w-5 h-5 rounded-[var(--country-radius-md)] flex items-center justify-center text-[11px]"
                style={{
                  background: "var(--country-earth-bg)",
                  color: "var(--country-earth)",
                }}
              >
                ↳
              </span>
              Noms à travers l&apos;histoire
            </div>
            <HistoryTimeline data={data.timeline} />
          </section>
        )}

        {/* 4. Peoples */}
        {data.peoples.rows.length > 0 && (
          <section
            className="country-fade-in rounded-[var(--country-radius-xl)] md:rounded-[20px] xl:rounded-[22px] p-[18px] md:p-6 xl:p-7 relative overflow-hidden"
            style={{
              background: "var(--country-card)",
              border: "1px solid var(--country-border)",
              animationDelay: "100ms",
            }}
          >
            <div
              className="flex items-center gap-[6px] text-[10px] md:text-[11px] font-extrabold uppercase tracking-[0.14em] mb-[14px] md:mb-[18px]"
              style={{ color: "var(--country-text-soft)" }}
            >
              <span
                className="w-5 h-5 rounded-[var(--country-radius-md)] flex items-center justify-center text-[11px]"
                style={{
                  background: "var(--country-terracotta-bg)",
                  color: "var(--country-terracotta)",
                }}
              >
                ◉
              </span>
              Peuples &amp; Démographie
            </div>
            <PeoplesSection data={data.peoples} />
          </section>
        )}

        {/* 5. Kingdoms */}
        {data.kingdoms.cards.length > 0 && (
          <section
            className="country-fade-in rounded-[var(--country-radius-xl)] md:rounded-[20px] xl:rounded-[22px] p-[18px] md:p-6 xl:p-7 relative overflow-hidden"
            style={{
              background: "var(--country-card)",
              border: "1px solid var(--country-border)",
              animationDelay: "150ms",
            }}
          >
            <div
              className="flex items-center gap-[6px] text-[10px] md:text-[11px] font-extrabold uppercase tracking-[0.14em] mb-[14px] md:mb-[18px]"
              style={{ color: "var(--country-text-soft)" }}
            >
              <span
                className="w-5 h-5 rounded-[var(--country-radius-md)] flex items-center justify-center text-[11px]"
                style={{
                  background: "var(--country-gold-bg)",
                  color: "var(--country-gold)",
                }}
              >
                ♛
              </span>
              {data.kingdoms.title}
            </div>
            <KingdomsSection data={data.kingdoms} />
          </section>
        )}

        {/* 5b. Historical Facts */}
        {data.historicalFacts && data.historicalFacts.periods.length > 0 && (
          <section
            className="country-fade-in rounded-[var(--country-radius-xl)] md:rounded-[20px] xl:rounded-[22px] p-[18px] md:p-6 xl:p-7 relative overflow-hidden"
            style={{
              background: "var(--country-card)",
              border: "1px solid var(--country-border)",
              animationDelay: "175ms",
            }}
          >
            <div
              className="flex items-center gap-[6px] text-[10px] md:text-[11px] font-extrabold uppercase tracking-[0.14em] mb-[14px] md:mb-[18px]"
              style={{ color: "var(--country-text-soft)" }}
            >
              <span
                className="w-5 h-5 rounded-[var(--country-radius-md)] flex items-center justify-center text-[11px]"
                style={{
                  background: "var(--country-earth-bg)",
                  color: "var(--country-earth)",
                }}
              >
                {"📜"}
              </span>
              Faits historiques majeurs
            </div>
            <HistoricalFactsSection data={data.historicalFacts} />
          </section>
        )}

        {/* 6. Languages */}
        {data.languages.bubbles.length > 0 && (
          <section
            className="country-fade-in rounded-[var(--country-radius-xl)] md:rounded-[20px] xl:rounded-[22px] p-[18px] md:p-6 xl:p-7 relative overflow-hidden"
            style={{
              background: "var(--country-card)",
              border: "1px solid var(--country-border)",
              animationDelay: "200ms",
            }}
          >
            <div
              className="flex items-center gap-[6px] text-[10px] md:text-[11px] font-extrabold uppercase tracking-[0.14em] mb-[14px] md:mb-[18px]"
              style={{ color: "var(--country-text-soft)" }}
            >
              <span
                className="w-5 h-5 rounded-[var(--country-radius-md)] flex items-center justify-center text-[11px]"
                style={{
                  background: "var(--country-green-bg)",
                  color: "var(--country-green)",
                }}
              >
                🗣
              </span>
              Langues · {data.languages.totalCount} répertoriées
            </div>
            <LanguagesSection data={data.languages} />
          </section>
        )}

        {/* 7. Culture */}
        {data.culture.items.length > 0 && (
          <section
            className="country-fade-in rounded-[var(--country-radius-xl)] md:rounded-[20px] xl:rounded-[22px] p-[18px] md:p-6 xl:p-7 relative overflow-hidden"
            style={{
              background: "var(--country-card)",
              border: "1px solid var(--country-border)",
              animationDelay: "250ms",
            }}
          >
            <div
              className="flex items-center gap-[6px] text-[10px] md:text-[11px] font-extrabold uppercase tracking-[0.14em] mb-[14px] md:mb-[18px]"
              style={{ color: "var(--country-text-soft)" }}
            >
              <span
                className="w-5 h-5 rounded-[var(--country-radius-md)] flex items-center justify-center text-[11px]"
                style={{
                  background: "var(--country-earth-bg)",
                  color: "var(--country-earth)",
                }}
              >
                ◈
              </span>
              Culture &amp; Société
            </div>
            <CultureGrid data={data.culture} />
          </section>
        )}
      </div>

      {/* 8. Sources Footer (outside content padding) */}
      {data.sources && (
        <div className="px-3 md:px-4 xl:px-5 mt-[10px] md:mt-[14px] xl:mt-4">
          <SourcesFooter sources={data.sources} hasSourceFlag={sourceFlag} />
        </div>
      )}
    </div>
  );
};
