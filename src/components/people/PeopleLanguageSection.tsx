import type { PeopleLanguageData } from "@/lib/peopleDataTransformer";
import { ProseWithChip } from "./ProseWithChip";
import type { LanguageChips } from "./ProseWithChip";

interface PeopleLanguageSectionProps {
  data: PeopleLanguageData;
  chips?: LanguageChips;
}

export function PeopleLanguageSection({
  data,
  chips,
}: PeopleLanguageSectionProps) {
  const hasContent =
    data.mainLanguage ||
    data.isoCodes.length > 0 ||
    data.dialects.length > 0 ||
    data.vehicularRole;

  if (!hasContent) return null;

  return (
    <div className="space-y-[14px]">
      {data.mainLanguage && (
        <div>
          <p className="people-section-label">Langue principale</p>
          <p className="people-section-body font-semibold">
            {data.mainLanguage}
          </p>
        </div>
      )}

      {data.isoCodes.length > 0 && (
        <div>
          <p className="people-section-label">Codes ISO</p>
          <div className="flex flex-wrap gap-[6px] mt-[4px]">
            {data.isoCodes.map((code) => (
              <span key={code} className="people-tag font-mono">
                {code}
              </span>
            ))}
          </div>
        </div>
      )}

      {data.dialects.length > 0 && (
        <div>
          <p className="people-section-label">Dialectes</p>
          <div className="flex flex-wrap gap-[6px] mt-[4px]">
            {data.dialects.map((d, i) => (
              <span key={i} className="people-tag">
                {d}
              </span>
            ))}
          </div>
        </div>
      )}

      {data.vehicularRole && (
        <div>
          <p className="people-section-label">Rôle véhiculaire</p>
          <ProseWithChip
            text={data.vehicularRole}
            chip={chips?.vehicularRole}
          />
        </div>
      )}
    </div>
  );
}
