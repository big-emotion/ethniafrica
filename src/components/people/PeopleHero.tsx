import { AutonymExonymHeading } from "./AutonymExonymHeading";
import { ConfidenceChip } from "@/components/source-transparency/ConfidenceChip";
import type { PeopleHeroData } from "@/lib/peopleDataTransformer";

interface PeopleHeroProps {
  data: PeopleHeroData;
  onBack?: () => void;
  onFlagCtaClick?: () => void;
  confidenceScore?: number | null;
  sourceCount?: number | null;
  lastHumanAuditAt?: string | null;
}

export function PeopleHero({
  data,
  onBack,
  onFlagCtaClick,
  confidenceScore = null,
  sourceCount = null,
  lastHumanAuditAt = null,
}: PeopleHeroProps) {
  return (
    <section
      className="mx-3 md:mx-4 xl:mx-5 rounded-[20px] md:rounded-[22px] xl:rounded-[24px] overflow-hidden relative"
      style={{
        background:
          "linear-gradient(165deg, #2b5f7a 0%, #1b3d52 50%, #0f2535 100%)",
        color: "white",
      }}
    >
      {/* Decorative orbs */}
      <div
        className="absolute -top-10 -right-10 w-[200px] h-[200px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(212,168,67,0.18) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute -bottom-8 -left-6 w-[160px] h-[160px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(91,141,184,0.15) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 px-5 py-6 md:p-[32px_28px] xl:p-[40px_36px]">
        {/* Top row: back link + badges */}
        <div className="flex justify-between items-center mb-5">
          {onBack ? (
            <button
              onClick={onBack}
              aria-label="Retour"
              className="flex items-center gap-1 text-white/60 text-[13px] hover:text-white/80 transition-colors bg-transparent border-0 cursor-pointer"
            >
              ← Retour
            </button>
          ) : (
            <span className="text-white/60 text-[13px]">← Afrique</span>
          )}

          <div className="flex gap-[6px] flex-wrap justify-end">
            {data.languageFamilyName && (
              <span className="people-hero-badge">
                {data.languageFamilyName}
              </span>
            )}
            <span className="people-hero-badge">
              {data.currentCountries.length} pays
            </span>
          </div>
        </div>

        {/* Name heading with autonym + exonyms */}
        <AutonymExonymHeading
          nameMain={data.nameMain}
          autonym={data.selfAppellation}
          exonyms={data.exonyms}
          variant="hero"
        />

        {/* Fiche-level ConfidenceChip + flag CTA */}
        <div className="flex items-center flex-wrap gap-3 mt-4">
          <ConfidenceChip
            confidenceScore={confidenceScore}
            sourceCount={sourceCount}
            lastHumanAuditAt={lastHumanAuditAt}
            variant="hero"
            id={data.peopleId}
            ariaSuffix={`pour la fiche ${data.nameMain}`}
          />

          {onFlagCtaClick && (
            <button
              type="button"
              onClick={onFlagCtaClick}
              aria-label="Signaler une erreur sur cette fiche"
              className="inline-flex items-center gap-1 px-3 py-2 rounded-full text-[11px] font-semibold bg-white/10 border border-white/15 text-white/80 hover:bg-white/15 transition-colors cursor-pointer"
            >
              ⚑ Signaler
            </button>
          )}
        </div>

        {/* Colonial term explanation if applicable */}
        {data.whyProblematic && (
          <div className="mt-4 px-[14px] py-[10px] bg-white/[0.06] rounded-[10px] border border-white/[0.1]">
            <p className="text-[11px] text-white/60 leading-[1.5]">
              <span className="font-semibold text-white/80">Note : </span>
              {data.whyProblematic}
            </p>
          </div>
        )}
      </div>

      <style>{`
        .people-hero-badge {
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.15);
          backdrop-filter: blur(8px);
          white-space: nowrap;
        }
        @media (min-width: 768px) {
          .people-hero-badge { font-size: 12px; }
        }
      `}</style>
    </section>
  );
}
