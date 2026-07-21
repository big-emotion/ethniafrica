"use client";

import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle } from "lucide-react";
import type { PeopleDetail } from "@/types/afrik-frontend";
import { getPeople } from "@/lib/afrikLoader";
import { transformPeopleData } from "@/lib/peopleDataTransformer";
import {
  PeopleHero,
  PeopleOriginBlock,
  PeopleLanguageSection,
  PeopleHistoryTimeline,
  PeopleCultureGrid,
  PeopleRelatedPeoplesSection,
  PeopleCountriesSection,
  PeopleSourcesFooter,
} from "@/components/people";
import { AfrikBreadcrumbs } from "@/components/layout/AfrikBreadcrumbs";

interface PeopleDetailViewV2Props {
  peopleId: string;
  onBack?: () => void;
  onFlagCtaClick?: () => void;
}

const SECTION_DELAY_MS = [0, 50, 100, 150, 200, 250, 300] as const;

function SectionCard({
  children,
  label,
  icon,
  iconBg,
  iconColor,
  delayIndex,
}: {
  children: React.ReactNode;
  label: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  delayIndex: number;
}) {
  return (
    <section
      className="people-fade-in rounded-[var(--country-radius-xl)] md:rounded-[20px] xl:rounded-[22px] p-[18px] md:p-6 xl:p-7 relative overflow-hidden"
      style={{
        background: "var(--country-card)",
        border: "1px solid var(--country-border)",
        animationDelay: `${SECTION_DELAY_MS[delayIndex] ?? 0}ms`,
      }}
    >
      <div
        className="flex items-center gap-[6px] text-[10px] md:text-[11px] font-extrabold uppercase tracking-[0.14em] mb-[14px] md:mb-[18px]"
        style={{ color: "var(--country-text-soft)" }}
      >
        <span
          className="w-5 h-5 rounded-[var(--country-radius-md)] flex items-center justify-center text-[11px]"
          style={{ background: iconBg, color: iconColor }}
        >
          {icon}
        </span>
        {label}
      </div>
      {children}
    </section>
  );
}

export function PeopleDetailViewV2({
  peopleId,
  onBack,
  onFlagCtaClick,
}: PeopleDetailViewV2Props) {
  const [people, setPeople] = useState<PeopleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);

    setError(null);

    getPeople(peopleId)
      .then((data) => {
        if (cancelled) return;
        if (data) {
          setPeople(data);
        } else {
          setError("Peuple non trouvé");
        }
      })
      .catch(() => {
        if (!cancelled) setError("Échec du chargement de la fiche");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [peopleId]);

  if (loading) {
    return (
      <div className="w-full">
        <div className="mx-3 md:mx-4 xl:mx-5 mt-3 rounded-[20px] overflow-hidden">
          <Skeleton className="h-[260px] w-full" />
        </div>
        <div className="px-3 md:px-4 xl:px-5 space-y-3 mt-3">
          <Skeleton className="h-[140px] w-full rounded-[16px]" />
          <Skeleton className="h-[180px] w-full rounded-[16px]" />
          <Skeleton className="h-[220px] w-full rounded-[16px]" />
        </div>
      </div>
    );
  }

  if (error || !people) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-3 p-6">
        <AlertTriangle className="h-10 w-10 text-destructive" />
        <p className="text-destructive text-sm font-medium">
          {error || "Peuple non trouvé"}
        </p>
      </div>
    );
  }

  const data = transformPeopleData(people);

  const breadcrumbs = [
    { label: "Familles", href: "/fr/familles" },
    ...(people.languageFamilyName
      ? [
          {
            label: people.languageFamilyName,
            href: `/fr/familles?family=${people.languageFamilyId}`,
          },
        ]
      : []),
    { label: data.hero.nameMain },
  ];

  return (
    <div
      className="w-full pb-3 md:pb-4 xl:pb-5"
      style={{
        fontFamily: "var(--country-font-body)",
        color: "var(--country-text)",
      }}
    >
      {/* 1. Hero — always above fold */}
      <PeopleHero
        data={data.hero}
        onBack={onBack}
        onFlagCtaClick={onFlagCtaClick}
      />

      {/* 2. Breadcrumbs — below hero, small type */}
      <AfrikBreadcrumbs items={breadcrumbs} />

      {/* Content area — max-width 800px reading surface */}
      <div
        className="px-3 md:px-4 xl:px-5 space-y-[10px] md:space-y-[14px] xl:space-y-4 mt-[10px] md:mt-[14px] xl:mt-4 mx-auto"
        style={{ maxWidth: "800px" }}
      >
        {/* 2. Origins */}
        {(data.origin.ancientOrigins ||
          data.origin.formationPeriod ||
          data.origin.migrationRoutes.length > 0 ||
          data.origin.historicalSettlementZones.length > 0 ||
          data.origin.externalInfluences) && (
          <SectionCard
            label="Origines & formation"
            icon="◎"
            iconBg="var(--country-earth-bg)"
            iconColor="var(--country-earth)"
            delayIndex={0}
          >
            <PeopleOriginBlock data={data.origin} />
          </SectionCard>
        )}

        {/* 3. Language */}
        {(data.language.mainLanguage ||
          data.language.isoCodes.length > 0 ||
          data.language.dialects.length > 0 ||
          data.language.vehicularRole) && (
          <SectionCard
            label="Langue"
            icon="🗣"
            iconBg="var(--country-green-bg)"
            iconColor="var(--country-green)"
            delayIndex={1}
          >
            <PeopleLanguageSection data={data.language} />
          </SectionCard>
        )}

        {/* 4. History */}
        {(data.history.kingdomsOrChiefdoms ||
          data.history.relationsWithNeighbors ||
          data.history.conflictsOrAlliances ||
          data.history.diaspora) && (
          <SectionCard
            label="Rôle historique"
            icon="↳"
            iconBg="var(--country-gold-bg)"
            iconColor="var(--country-gold)"
            delayIndex={2}
          >
            <PeopleHistoryTimeline data={data.history} />
          </SectionCard>
        )}

        {/* 5. Culture */}
        {(data.culture.supremeDeity ||
          data.culture.intermediates.length > 0 ||
          data.culture.symbols.length > 0 ||
          data.culture.music ||
          data.culture.gastronomy ||
          data.culture.christianityPercentage != null ||
          data.culture.islamPercentage != null) && (
          <SectionCard
            label="Culture & spiritualité"
            icon="◈"
            iconBg="var(--country-terracotta-bg)"
            iconColor="var(--country-terracotta)"
            delayIndex={3}
          >
            <PeopleCultureGrid data={data.culture} />
          </SectionCard>
        )}

        {/* 6. Related peoples & organization */}
        {(data.relatedPeoples.ethnicities.length > 0 ||
          data.relatedPeoples.politicalSystem ||
          data.relatedPeoples.clanOrganization ||
          data.relatedPeoples.ageClassSystems) && (
          <SectionCard
            label="Peuples voisins & organisation"
            icon="◉"
            iconBg="var(--country-earth-bg)"
            iconColor="var(--country-earth)"
            delayIndex={4}
          >
            <PeopleRelatedPeoplesSection data={data.relatedPeoples} />
          </SectionCard>
        )}

        {/* 7. Countries & demographics */}
        {data.countries.distributions.length > 0 && (
          <SectionCard
            label="Répartition géographique"
            icon="◉"
            iconBg="var(--country-terracotta-bg)"
            iconColor="var(--country-terracotta)"
            delayIndex={5}
          >
            <PeopleCountriesSection data={data.countries} />
          </SectionCard>
        )}
      </div>

      {/* 8. Sources footer (outside content padding, max-width) */}
      {data.sources && (
        <div
          className="px-3 md:px-4 xl:px-5 mt-[10px] md:mt-[14px] xl:mt-4 mx-auto"
          style={{ maxWidth: "800px" }}
        >
          <PeopleSourcesFooter sources={data.sources} />
        </div>
      )}
    </div>
  );
}
