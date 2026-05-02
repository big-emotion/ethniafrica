import type { HistoricalFactsData } from "@/lib/countryDataTransformer";

interface HistoricalFactsSectionProps {
  data: HistoricalFactsData;
}

export function HistoricalFactsSection({ data }: HistoricalFactsSectionProps) {
  if (data.periods.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 md:gap-4">
      {data.periods.map((period, i) => (
        <div
          key={i}
          className="p-4 md:p-[18px] xl:p-5 rounded-[var(--country-radius-lg)] xl:rounded-[16px]"
          style={{
            background: "var(--country-earth-bg)",
            border: "1px solid rgba(139,90,43,0.15)",
          }}
        >
          {/* Period label */}
          <div
            className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.08em] mb-1"
            style={{ color: "var(--country-earth)" }}
          >
            {period.label}
          </div>

          {/* Period content */}
          <div
            className="text-[13px] md:text-[14px] xl:text-[15px] leading-relaxed"
            style={{ color: "var(--country-text)" }}
          >
            {period.content}
          </div>
        </div>
      ))}
    </div>
  );
}
