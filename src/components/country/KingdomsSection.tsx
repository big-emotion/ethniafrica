import type { KingdomsData, KingdomCard } from "@/lib/countryDataTransformer";

interface KingdomsSectionProps {
  data: KingdomsData;
}

export function KingdomsSection({ data }: KingdomsSectionProps) {
  if (data.cards.length === 0) return null;

  const isScroll = data.layout === "scroll";

  const containerClass = isScroll
    ? [
        "flex flex-row gap-[10px] overflow-x-auto -mx-[18px] px-[18px] pb-2",
        "scrollbar-none touch-pan-x",
        "md:grid md:grid-cols-3 md:overflow-visible md:mx-0 md:px-0 md:pb-0",
      ].join(" ")
    : ["flex flex-col gap-[10px]", "md:grid md:grid-cols-2 md:gap-3"].join(" ");

  return (
    <div>
      {/* Section title */}
      <div
        className="text-[18px] md:text-[20px] font-bold mb-3 md:mb-4"
        style={{
          fontFamily: "var(--country-font-display)",
          color: "var(--country-text)",
        }}
      >
        {data.title}
      </div>

      {/* Cards container */}
      <div className={containerClass}>
        {data.cards.map((card, i) => (
          <KingdomCardItem key={i} card={card} isScroll={isScroll} />
        ))}
      </div>
    </div>
  );
}

// ==========================================
// KingdomCardItem
// ==========================================

function KingdomCardItem({
  card,
  isScroll,
}: {
  card: KingdomCard;
  isScroll: boolean;
}) {
  const sizeClass = isScroll
    ? "min-w-[200px] max-w-[220px] md:min-w-0 md:max-w-none flex-shrink-0"
    : "";

  return (
    <div
      className={[
        sizeClass,
        "p-4 md:p-[18px] xl:p-5",
        "rounded-[var(--country-radius-lg)] xl:rounded-[16px]",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        background: "var(--country-gold-bg)",
        border: "1px solid rgba(184,134,11,0.2)",
      }}
    >
      {/* Period */}
      {card.period && (
        <div
          className="text-[10px] font-bold uppercase tracking-[0.08em] mb-1"
          style={{ color: "var(--country-gold)" }}
        >
          {card.period}
        </div>
      )}

      {/* Name */}
      <div
        className="text-[17px] xl:text-[19px] font-bold mb-1"
        style={{
          fontFamily: "var(--country-font-display)",
          color: "var(--country-text)",
        }}
      >
        {card.name}
      </div>

      {/* Peoples */}
      {card.peoples && (
        <div
          className="text-[11px] xl:text-[12px] mb-2"
          style={{ color: "var(--country-text-soft)" }}
        >
          {card.peoples}
        </div>
      )}

      {/* Tags */}
      {card.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {card.tags.map((tag, i) => (
            <span
              key={i}
              className="text-[10px] xl:text-[11px] py-[2px] px-[7px] rounded-sm font-semibold"
              style={{
                background: "rgba(184,134,11,0.12)",
                color: "var(--country-gold)",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
