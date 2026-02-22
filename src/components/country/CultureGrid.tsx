import type {
  CultureGridData,
  CultureGridItem,
} from "@/lib/countryDataTransformer";

interface CultureGridProps {
  data: CultureGridData;
}

type Slot = CultureGridItem["slot"];

const SLOT_STYLES: Record<Slot, { bg: string; labelColor: string }> = {
  religion: {
    bg: "var(--country-earth-bg)",
    labelColor: "var(--country-earth)",
  },
  economy: {
    bg: "var(--country-green-bg)",
    labelColor: "var(--country-green)",
  },
  social: {
    bg: "var(--country-gold-bg)",
    labelColor: "var(--country-gold)",
  },
  relations: {
    bg: "var(--country-terracotta-bg)",
    labelColor: "var(--country-terracotta)",
  },
};

export function CultureGrid({ data }: CultureGridProps) {
  if (data.items.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-2 md:gap-3 xl:gap-[14px]">
      {data.items.map((item) => (
        <CultureGridCell key={item.slot} item={item} />
      ))}
    </div>
  );
}

// ==========================================
// CultureGridCell
// ==========================================

function CultureGridCell({ item }: { item: CultureGridItem }) {
  const { bg, labelColor } = SLOT_STYLES[item.slot];

  return (
    <div
      className="p-3 md:p-4 xl:p-[18px] rounded-[var(--country-radius-base)] xl:rounded-[14px] text-center"
      style={{ background: bg }}
    >
      <div className="text-2xl xl:text-[28px] mb-1">{item.icon}</div>

      <div
        className="text-[10px] xl:text-[11px] font-bold uppercase tracking-[0.08em] mb-1"
        style={{ color: labelColor }}
      >
        {item.label}
      </div>

      <div
        className="text-xs md:text-[13px] xl:text-sm leading-[1.4]"
        style={{ color: "var(--country-text-soft)" }}
      >
        {item.keywords.join(", ")}
      </div>
    </div>
  );
}
