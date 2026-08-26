import { SourceVerifyBadge } from "@/components/ui/source-verify-badge";
import type { LabelledFicheSource } from "@/lib/afrik/ficheSourceLabel";

interface PeopleSourcesFooterProps {
  sources: LabelledFicheSource[];
  /** An open flag on this fiche's sourcing — someone has contested it and the reader should know before reading on. */
  hasSourceFlag?: boolean;
}

/**
 * The fiche's sources, one per row, each showing the tier it actually carries.
 *
 * Nothing is excluded for being weak — the policy labels rather than filters,
 * because dropping oral, community and amateur knowledge would itself be a
 * colonial filter. What the reader gets is the claim and its provenance side
 * by side, so a fiche resting entirely on unverified sources says so instead
 * of looking like any other.
 */
// @req REQ-092
export function PeopleSourcesFooter({
  sources,
  hasSourceFlag = false,
}: PeopleSourcesFooterProps) {
  if (!sources || sources.length === 0) return null;

  return (
    <div
      className="rounded-[var(--country-radius-xl)] xl:rounded-[20px] px-[18px] py-[16px] md:px-[24px] md:py-[20px] xl:px-[28px] xl:py-[22px] text-[10px] xl:text-[11px] leading-[1.6]"
      style={{
        backgroundColor: "var(--country-bg-warm)",
        color: "var(--country-text-soft)",
      }}
    >
      <p
        className="text-[10px] font-extrabold uppercase mb-[6px]"
        style={{ letterSpacing: "0.12em", color: "var(--country-earth)" }}
      >
        Sources &amp; Références
      </p>
      {hasSourceFlag && (
        <div className="mb-afh-xs">
          <SourceVerifyBadge />
        </div>
      )}
      <ul className="flex flex-col gap-afh-xs">
        {sources.map((source) => (
          <li
            key={`${source.tier}-${source.title}`}
            className="flex flex-wrap items-baseline gap-afh-xs"
            data-source-tier={source.tier}
          >
            <span
              className="rounded-afh-full border px-afh-xs text-[9px] font-bold uppercase"
              style={{ letterSpacing: "0.08em" }}
            >
              {source.tierLabel}
            </span>
            {/* A source with no url stays readable rather than becoming a
                dead link: the citation is the point, the link is a courtesy. */}
            {source.url ? (
              <a
                href={source.url}
                rel="noreferrer noopener"
                target="_blank"
                className="underline underline-offset-2"
              >
                {source.title}
              </a>
            ) : (
              <span>{source.title}</span>
            )}
            {source.notes && <span>— {source.notes}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
