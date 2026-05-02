import type {
  LanguagesData,
  LanguageBubble,
} from "@/lib/countryDataTransformer";

interface LanguagesSectionProps {
  data: LanguagesData;
}

export function LanguagesSection({ data }: LanguagesSectionProps) {
  if (data.bubbles.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 md:gap-2 xl:gap-[10px] justify-center">
      {data.bubbles.map((bubble, i) => (
        <LanguageBubbleItem key={i} bubble={bubble} />
      ))}

      {data.overflowCount > 0 && <OverflowPill count={data.overflowCount} />}
    </div>
  );
}

// ==========================================
// LanguageBubbleItem
// ==========================================

function LanguageBubbleItem({ bubble }: { bubble: LanguageBubble }) {
  const sizeClass = bubbleSizeClass(bubble.size);

  return (
    <span
      className={[
        "inline-flex items-center gap-[5px]",
        "rounded-full font-semibold",
        sizeClass,
        bubble.size === "small" ? "opacity-80" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        border: "1.5px solid",
        borderColor: bubble.isOfficial
          ? "var(--country-green)"
          : "var(--country-border)",
        background: bubble.isOfficial
          ? "var(--country-green-bg)"
          : "var(--country-card)",
        color: bubble.isOfficial
          ? "var(--country-green)"
          : "var(--country-text)",
      }}
    >
      {bubble.isOfficial ? `\u{1F3DB} ${bubble.name}` : bubble.name}

      {bubble.code && (
        <span
          className="text-[9px] xl:text-[10px] font-bold py-[1px] px-[5px] rounded-sm font-mono"
          style={{
            background: "var(--country-bg-warm)",
            color: "var(--country-text-soft)",
          }}
        >
          {bubble.code}
        </span>
      )}
    </span>
  );
}

function bubbleSizeClass(size: LanguageBubble["size"]): string {
  switch (size) {
    case "big":
      return [
        "text-[15px] md:text-base xl:text-[17px]",
        "px-[18px] py-[10px] md:px-[20px] md:py-[12px] xl:px-[22px] xl:py-[12px]",
      ].join(" ");
    case "regular":
      return [
        "text-[13px] md:text-sm xl:text-sm",
        "px-[14px] py-[8px] md:px-[16px] md:py-[10px] xl:px-[18px] xl:py-[10px]",
      ].join(" ");
    case "small":
      return [
        "text-xs md:text-[13px] xl:text-[13px]",
        "px-[12px] py-[6px] md:px-[14px] md:py-[8px]",
      ].join(" ");
  }
}

// ==========================================
// OverflowPill
// ==========================================

function OverflowPill({ count }: { count: number }) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1",
        "px-[16px] py-[8px] md:px-[18px] md:py-[10px] xl:px-[20px] xl:py-[10px]",
        "rounded-full",
        "text-[13px] md:text-sm xl:text-sm font-bold",
      ].join(" ")}
      style={{
        background: "var(--country-earth-bg)",
        border: "1.5px dashed var(--country-earth)",
        color: "var(--country-earth)",
      }}
    >
      + {count} autres langues
    </span>
  );
}
