interface AutonymExonymHeadingProps {
  nameMain: string;
  autonym?: string;
  exonyms: string[];
  variant: "hero" | "section";
}

export function AutonymExonymHeading({
  nameMain,
  autonym,
  exonyms,
  variant,
}: AutonymExonymHeadingProps) {
  const isHero = variant === "hero";

  return (
    <div className={isHero ? "mb-2" : "mb-1"}>
      <h1
        className={
          isHero
            ? "leading-none tracking-[-0.02em] text-white"
            : "leading-tight tracking-tight"
        }
        style={
          isHero
            ? {
                fontFamily: "var(--country-font-display)",
                fontSize: "var(--country-text-hero)",
                fontWeight: 900,
              }
            : { fontFamily: "var(--country-font-display)", fontWeight: 700 }
        }
      >
        {nameMain}
      </h1>

      {autonym && (
        <p
          data-autonym="true"
          className={
            isHero
              ? "text-white/70 text-[14px] md:text-[15px] mt-1 font-medium"
              : "text-[color:var(--country-text-soft)] text-[13px] mt-0.5"
          }
        >
          {autonym}
        </p>
      )}

      {exonyms.length > 0 && (
        <div
          data-exonyms="true"
          className="flex flex-wrap gap-[5px] mt-[6px]"
        >
          {exonyms.map((e) => (
            <span
              key={e}
              className={
                isHero
                  ? "px-[8px] py-[2px] rounded-full text-[11px] font-medium bg-white/10 border border-white/15 text-white/80"
                  : "px-[6px] py-[1px] rounded-full text-[10px] font-medium bg-[color:var(--country-card)] border border-[color:var(--country-border)] text-[color:var(--country-text-soft)]"
              }
            >
              {e}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
