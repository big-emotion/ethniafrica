import type { OriginData } from "@/lib/countryDataTransformer";

interface OriginBannerProps {
  data: OriginData;
}

const tonalityStyles = {
  revolution: {
    bg: "var(--country-terracotta-bg)",
    border: "rgba(194,83,42,0.15)",
    avatarBg: "var(--country-terracotta)",
    nameColor: "var(--country-terracotta)",
  },
  colonial: {
    bg: "var(--country-colonial-bg)",
    border: "rgba(155,48,48,0.15)",
    avatarBg: "var(--country-colonial)",
    nameColor: "var(--country-colonial)",
  },
  neutral: {
    bg: "var(--country-earth-bg)",
    border: "rgba(139,107,71,0.15)",
    avatarBg: "var(--country-earth)",
    nameColor: "var(--country-earth)",
  },
};

export function OriginBanner({ data }: OriginBannerProps) {
  const styles = tonalityStyles[data.tonality];

  return (
    <div
      className="flex gap-3 items-start p-[14px] rounded-[var(--country-radius-base)]"
      style={{
        background: styles.bg,
        border: `1px solid ${styles.border}`,
      }}
    >
      <div
        className="w-[42px] h-[42px] min-w-[42px] xl:w-12 xl:h-12 xl:min-w-12 rounded-full text-white flex items-center justify-center text-lg xl:text-[22px] font-extrabold"
        style={{
          background: styles.avatarBg,
          fontFamily: "var(--country-font-display)",
        }}
      >
        {data.initials}
      </div>
      <div>
        <div
          className="text-base xl:text-[17px] font-bold"
          style={{
            fontFamily: "var(--country-font-display)",
            color: styles.nameColor,
          }}
        >
          {data.personName}
        </div>
        {data.date && (
          <div
            className="text-xs font-semibold mb-1"
            style={{ color: "var(--country-text-soft)" }}
          >
            {data.date}
          </div>
        )}
        {data.description && (
          <div
            className="text-xs leading-[1.45]"
            style={{ color: "var(--country-text-soft)" }}
          >
            {data.description}
          </div>
        )}
        {data.oldName && (
          <span
            className="inline-flex items-center gap-1 mt-1.5 px-2.5 py-0.5 text-[11px] xl:text-xs font-bold rounded-[var(--country-radius-md)] line-through"
            style={{
              background: "var(--country-colonial-bg)",
              color: "var(--country-colonial)",
              border: "1px solid rgba(155,48,48,0.15)",
            }}
          >
            ✕ {data.oldName}
          </span>
        )}
      </div>
    </div>
  );
}
