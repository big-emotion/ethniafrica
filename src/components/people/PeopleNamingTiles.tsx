import { FicheTile, FicheTiles } from "@/components/fiche/FicheTile";
import { AutonymExonymHeading } from "@/components/ui/AutonymExonymHeading";
import { peopleCopy } from "@/lib/i18n/copy/people";
import { FALLBACK_LOCALE } from "@/lib/locale";
import type { Language } from "@/types/shared";

interface PeopleNamingTilesProps {
  nameMain: string;
  selfAppellation?: string | null;
  exonyms?: string[] | null;
  originOfExonyms?: string | null;
  whyProblematic?: string | null;
  contemporaryUsage?: string | null;
  isoCode?: string;
  language?: Language;
}

// @req REQ-153
export function PeopleNamingTiles({
  nameMain,
  selfAppellation,
  exonyms,
  originOfExonyms,
  whyProblematic,
  contemporaryUsage,
  isoCode,
  language = FALLBACK_LOCALE,
}: PeopleNamingTilesProps) {
  const copy = peopleCopy[language].naming;
  const autonym = selfAppellation || nameMain;
  const names = exonyms?.filter(Boolean) ?? [];

  return (
    <FicheTiles>
      <FicheTile
        language={language}
        title={copy.selfDesignation}
        closedFact={autonym}
        closedFactContent={
          <AutonymExonymHeading
            variant="card"
            autonym={autonym}
            autonymIso639_3={isoCode}
          />
        }
      />

      {names.length > 0 && (
        <FicheTile
          language={language}
          title={copy.exonyms}
          closedFact={copy.exonymCount(names.length)}
          detailText={names.join(", ")}
        >
          <AutonymExonymHeading
            variant="people-naming"
            nameMain={nameMain}
            autonym={autonym}
            autonymIso639_3={isoCode}
            exonyms={names}
            language={language}
          />
        </FicheTile>
      )}

      {originOfExonyms && (
        <FicheTile
          language={language}
          title={copy.origin}
          closedFact={originOfExonyms}
        />
      )}

      {(contemporaryUsage || whyProblematic) && (
        <FicheTile
          language={language}
          title={copy.currentUsageAndCritique}
          closedFact={contemporaryUsage || whyProblematic || ""}
        >
          {contemporaryUsage && whyProblematic ? (
            <p>
              <strong>{copy.problematic}</strong> {whyProblematic}
            </p>
          ) : null}
        </FicheTile>
      )}
    </FicheTiles>
  );
}
