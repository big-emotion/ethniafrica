import Link from "next/link";
import type { ParagraphNoteData } from "@/components/people/peopleFicheNotes";
import type { PeopleLanguageData } from "@/lib/peopleDataTransformer";
import { ProseWithChip } from "./ProseWithChip";
import type { LanguageChips } from "./ProseWithChip";
import { getFamilyRoute } from "@/lib/routing";

interface PeopleLanguageSectionProps {
  data: PeopleLanguageData;
  chips?: LanguageChips;
  /** One note callout per sourced field, keyed as `chips` is. */
  notes?: Partial<Record<string, ParagraphNoteData>>;
}

// @req REQ-091
export function PeopleLanguageSection({
  data,
  chips,
  notes,
}: PeopleLanguageSectionProps) {
  const hasContent =
    data.mainLanguage ||
    data.isoCodes.length > 0 ||
    data.dialects.length > 0 ||
    data.vehicularRole ||
    data.languageFamilyId;

  if (!hasContent) return null;

  return (
    <dl className="afh-prose-fields space-y-[14px]">
      {data.languageFamilyId && (
        <div>
          <dt className="people-section-label">Famille linguistique</dt>
          <dd className="afh-prose-def">
            <Link
              href={getFamilyRoute("fr", data.languageFamilyId)}
              // The definition's whole value is this link, so it is a
              // navigation target rather than a word in a sentence and owes
              // the 44px floor — it measured 23px tall.
              className="people-section-body inline-flex min-h-11 items-center font-semibold hover:underline"
              style={{ color: "var(--country-terracotta-ink)" }}
            >
              {data.languageFamilyName ?? data.languageFamilyId}
            </Link>
          </dd>
        </div>
      )}

      {data.mainLanguage && (
        <div>
          <dt className="people-section-label">Langue principale</dt>
          <dd className="afh-prose-def">
            <p className="people-section-body font-semibold">
              {data.mainLanguage}
            </p>
          </dd>
        </div>
      )}

      {data.isoCodes.length > 0 && (
        <div>
          <dt className="people-section-label">Codes ISO</dt>
          <dd className="afh-prose-def">
            <div className="flex flex-wrap gap-[6px] mt-[4px]">
              {data.isoCodes.map((code) => (
                <span key={code} className="people-tag font-mono">
                  {code}
                </span>
              ))}
            </div>
          </dd>
        </div>
      )}

      {data.dialects.length > 0 && (
        <div>
          <dt className="people-section-label">Dialectes</dt>
          <dd className="afh-prose-def">
            <div className="flex flex-wrap gap-[6px] mt-[4px]">
              {data.dialects.map((d, i) => (
                <span key={i} className="people-tag">
                  {d}
                </span>
              ))}
            </div>
          </dd>
        </div>
      )}

      {data.vehicularRole && (
        <div>
          <dt className="people-section-label">Rôle véhiculaire</dt>
          <dd className="afh-prose-def">
            <ProseWithChip
              text={data.vehicularRole}
              chip={chips?.vehicularRole}
              note={notes?.vehicularRole}
            />
          </dd>
        </div>
      )}
    </dl>
  );
}
