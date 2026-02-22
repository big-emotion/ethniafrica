import type { TimelineData } from "@/lib/countryDataTransformer";

interface HistoryTimelineProps {
  data: TimelineData;
}

export function HistoryTimeline({ data }: HistoryTimelineProps) {
  if (data.items.length === 0) return null;

  const { goldEnd, colonialEnd } = data.gradientStops;

  return (
    <div className="relative pl-[var(--country-tl-indent)] xl:pl-[34px]">
      {/* Vertical gradient line */}
      <div
        className="absolute left-2 top-1 bottom-1 w-[var(--country-tl-line-width)] rounded-sm"
        style={{
          background: `linear-gradient(to bottom,
            var(--country-gold) 0%, var(--country-gold) ${goldEnd}%,
            var(--country-colonial) ${goldEnd}%, var(--country-colonial) ${colonialEnd}%,
            var(--country-green) ${colonialEnd}%, var(--country-green) 100%)`,
        }}
      />

      {data.items.map((item, i) => (
        <div
          key={i}
          className={`relative ${i < data.items.length - 1 ? "pb-4 md:pb-5 xl:pb-6" : ""}`}
          data-type={item.type}
        >
          {/* Dot */}
          <div
            className="absolute -left-6 xl:-left-[30px] top-[5px] w-[var(--country-tl-dot-size)] h-[var(--country-tl-dot-size)] xl:w-3 xl:h-3 rounded-full z-10"
            style={getDotStyle(item.type)}
          />

          <div
            className="text-[var(--country-text-nano)] xl:text-[10px] font-extrabold uppercase tracking-[0.1em] mb-px"
            style={{ color: getEraColor(item.type) }}
          >
            {item.era}
          </div>
          <div
            className="text-base md:text-lg xl:text-xl font-bold leading-[1.25] mb-0.5"
            style={{
              fontFamily: "var(--country-font-display)",
              ...(item.type === "colonial"
                ? {
                    textDecoration: "line-through",
                    textDecorationColor: "var(--country-colonial)",
                  }
                : {}),
            }}
          >
            {item.name}
            {item.type === "sovereign" && " ✦"}
          </div>
          {item.note && (
            <div
              className="text-[11px] md:text-xs xl:text-[13px] leading-[1.4]"
              style={{ color: "var(--country-text-soft)" }}
            >
              {item.note}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function getDotStyle(type: string): React.CSSProperties {
  switch (type) {
    case "kingdom":
      return {
        borderColor: "var(--country-gold)",
        background: "var(--country-gold-bg)",
        border: "2px solid var(--country-gold)",
      };
    case "colonial":
      return {
        borderColor: "var(--country-colonial)",
        background: "var(--country-colonial-bg)",
        border: "2px solid var(--country-colonial)",
      };
    case "sovereign":
      return {
        borderColor: "var(--country-green)",
        background: "var(--country-green)",
        border: "2px solid var(--country-green)",
        boxShadow: "0 0 0 3px rgba(43,107,66,0.15)",
      };
    default:
      return {
        border: "2px solid var(--country-border)",
        background: "var(--country-card)",
      };
  }
}

function getEraColor(type: string): string {
  switch (type) {
    case "kingdom":
      return "var(--country-gold)";
    case "colonial":
      return "var(--country-colonial)";
    case "sovereign":
      return "var(--country-green)";
    default:
      return "var(--country-text-soft)";
  }
}
