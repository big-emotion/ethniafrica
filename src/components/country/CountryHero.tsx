import type { HeroData } from "@/lib/countryDataTransformer";

interface CountryHeroProps {
  data: HeroData;
  onBack?: () => void;
  backLabel?: string;
}

export function CountryHero({ data, onBack, backLabel }: CountryHeroProps) {
  return (
    <section
      className="mx-[var(--country-page-padding)] rounded-[var(--country-radius-2xl)] overflow-hidden relative"
      style={{
        background: `linear-gradient(165deg, var(--country-hero-start) 0%, var(--country-hero-mid) 50%, var(--country-hero-end) 100%)`,
        color: "white",
      }}
    >
      {/* Decorative orbs */}
      <div
        className="absolute -top-10 -right-10 w-[200px] h-[200px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(184,134,11,0.2) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute -bottom-[30px] -left-5 w-[160px] h-[160px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(194,83,42,0.15) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 px-5 py-6 md:p-[32px_28px] xl:p-[40px_36px]">
        {/* Top row: back link + badges */}
        <div className="flex justify-between items-center mb-5">
          {onBack ? (
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-white/60 text-[13px] hover:text-white/80 transition-colors bg-transparent border-0 cursor-pointer"
            >
              ← {backLabel}
            </button>
          ) : (
            <span className="text-white/60 text-[13px]">← Afrique</span>
          )}
          <div className="flex gap-[6px]">
            <span className="hero-badge">{data.iso}</span>
            {data.year && <span className="hero-badge">{data.year}</span>}
          </div>
        </div>

        {/* Flag + Name */}
        <div className="flex items-center gap-[14px] md:gap-5 mb-2">
          <span className="text-[48px] md:text-[56px] xl:text-[64px] leading-none drop-shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
            {data.flag}
          </span>
          <div>
            <h1
              className="leading-none tracking-[-0.02em]"
              style={{
                fontFamily: "var(--country-font-display)",
                fontSize: "var(--country-text-hero)",
                fontWeight: "var(--country-weight-black)" as unknown as number,
              }}
            >
              {data.countryName}
            </h1>
            <div className="text-xs font-normal opacity-50 mt-0.5">
              {data.nameOfficial && data.nameOfficial !== data.countryName
                ? data.nameOfficial
                : "Nom officiel"}
            </div>
          </div>
        </div>

        {/* Meaning block */}
        {(data.meaningQuote || data.meaningHighlight) && (
          <div className="mt-4 p-[16px_18px] bg-white/[0.08] backdrop-blur-[16px] border border-white/[0.12] rounded-[var(--country-radius-lg)] text-center">
            <div
              className="mb-1.5 leading-[1.3]"
              style={{
                fontFamily: "var(--country-font-display)",
                fontSize: "24px",
                fontWeight: 700,
              }}
            >
              &laquo;&nbsp;
              {data.meaningQuote && <>{data.meaningQuote} </>}
              <span
                style={{
                  color: "var(--country-hero-highlight)",
                  fontWeight: 900,
                }}
              >
                {data.meaningHighlight}
              </span>
              &nbsp;&raquo;
            </div>
            {data.meaningLangs && (
              <div className="text-[11px] opacity-60 font-medium">
                {data.meaningLangs}
              </div>
            )}
            {data.isUncertain && (
              <div className="inline-flex items-center gap-1 mt-1.5 px-2.5 py-0.5 rounded-[var(--country-radius-2xl)] text-[10px] font-semibold bg-white/10 border border-white/[0.15]">
                ⚠ Étymologie débattue
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .hero-badge {
          padding: 4px 10px;
          border-radius: var(--country-radius-2xl);
          font-size: 11px;
          font-weight: 700;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.15);
          backdrop-filter: blur(8px);
        }
        @media (min-width: 768px) {
          .hero-badge { font-size: 12px; }
        }
        @media (min-width: 1200px) {
          .hero-badge { font-size: 12px; padding: 5px 12px; }
        }
      `}</style>
    </section>
  );
}
