import Link from "next/link";
import type { PeopleReference } from "@/types/afrik";

interface FamilyPeoplesSectionProps {
  peoples: PeopleReference[];
  lang?: string;
}

export function FamilyPeoplesSection({
  peoples,
  lang = "fr",
}: FamilyPeoplesSectionProps) {
  if (peoples.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-[8px]">
      {peoples.map((p, i) =>
        p.peopleId ? (
          <Link
            key={i}
            href={`/${lang}/peuples/${p.peopleId}`}
            className="px-[10px] py-[6px] rounded-[var(--country-radius-md)] border hover:opacity-80 transition-opacity"
            style={{
              background: "var(--country-earth-bg)",
              borderColor: "var(--country-border)",
              color: "var(--country-text)",
              fontFamily: "var(--country-font-body)",
              fontSize: "13px",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            {p.name}
          </Link>
        ) : (
          <span
            key={i}
            className="px-[10px] py-[6px] rounded-[var(--country-radius-md)] border"
            style={{
              background: "var(--country-earth-bg)",
              borderColor: "var(--country-border)",
              color: "var(--country-text)",
              fontFamily: "var(--country-font-body)",
              fontSize: "13px",
              fontWeight: 600,
            }}
          >
            {p.name}
          </span>
        )
      )}
    </div>
  );
}
