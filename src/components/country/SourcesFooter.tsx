import { SourceVerifyBadge } from "@/components/ui/source-verify-badge";
import type { FicheSourceEntry } from "@/lib/afrik/ficheSourceLabel";
import { sourceStandingLabelFr } from "@/types/sources";

interface SourcesFooterProps {
  sources: FicheSourceEntry[];
  /** Story 0.20 (FR31): show a "source à vérifier" badge when truthy. */
  hasSourceFlag?: boolean;
}

/**
 * A source's standing is shown per entry, never as one verdict over the
 * list: a fiche rests on sources of different strengths, and joining them
 * into a single line was what made the strongest and the weakest read
 * alike.
 */
// @req REQ-092
export function SourcesFooter({ sources, hasSourceFlag }: SourcesFooterProps) {
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
        className="text-[10px] font-extrabold uppercase mb-[6px] flex items-center gap-2 flex-wrap"
        style={{
          letterSpacing: "0.12em",
          color: "var(--country-earth)",
        }}
      >
        <span>Sources &amp; Références</span>
        {hasSourceFlag && <SourceVerifyBadge />}
      </p>
      <ul className="flex flex-col gap-[6px]">
        {sources.map((source, index) => (
          <li
            key={`${source.label}-${index}`}
            className="flex items-baseline gap-2 flex-wrap"
          >
            <span
              data-source-standing={source.standing}
              className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-medium"
              style={
                source.standing === "needs_review"
                  ? {
                      // Awaiting review is not a tier, so it does not wear a
                      // tier's filled chip: it is outlined instead.
                      border: "1px solid var(--country-border)",
                      color: "var(--country-text-soft)",
                    }
                  : {
                      backgroundColor: "var(--country-bg)",
                      color: "var(--country-text-soft)",
                    }
              }
            >
              {sourceStandingLabelFr(source.standing)}
            </span>
            {source.url ? (
              <a
                href={source.url}
                rel="noreferrer noopener"
                target="_blank"
                className="underline underline-offset-2"
              >
                {source.label}
              </a>
            ) : (
              <span>{source.label}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
