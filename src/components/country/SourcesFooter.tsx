import { SourceVerifyBadge } from "@/components/ui/source-verify-badge";
import type { FicheSourceEntry } from "@/lib/afrik/ficheSourceLabel";
import { sourceStandingLabelFr } from "@/types/sources";

interface SourcesFooterProps {
  sources: FicheSourceEntry[];
  /** Story 0.20 (FR31): show a "source à vérifier" badge when truthy. */
  hasSourceFlag?: boolean;
  /**
   * `"card"` is the directory's rounded block; `"parchment"` drops the card so
   * the list sits flat in a fiche section, which is one continuous document
   * and boxes nothing. Same standing rule either way — one component, one
   * reading of a source's authority, two skins.
   */
  variant?: "card" | "parchment";
}

/**
 * A source's standing is shown per entry, never as one verdict over the
 * list: a fiche rests on sources of different strengths, and joining them
 * into a single line was what made the strongest and the weakest read
 * alike.
 */
// @req REQ-092
export function SourcesFooter({
  sources,
  hasSourceFlag,
  variant = "card",
}: SourcesFooterProps) {
  if (!sources || sources.length === 0) return null;

  const isParchment = variant === "parchment";

  return (
    <div
      className={
        isParchment
          ? "text-afh-caption leading-[1.6]"
          : "rounded-[var(--country-radius-xl)] xl:rounded-[20px] px-[18px] py-[16px] md:px-[24px] md:py-[20px] xl:px-[28px] xl:py-[22px] text-afh-caption leading-[1.6]"
      }
      style={{
        backgroundColor: isParchment ? undefined : "var(--country-bg-warm)",
        color: "var(--country-text-soft)",
      }}
    >
      {/* The parchment section already carries its own <h2>; a second heading
          here would say "Sources" twice over. */}
      {isParchment ? (
        hasSourceFlag && (
          <p className="mb-[6px]">
            <SourceVerifyBadge />
          </p>
        )
      ) : (
        <p
          className="text-afh-eyebrow font-extrabold uppercase mb-[6px] flex items-center gap-2 flex-wrap"
          style={{
            letterSpacing: "0.12em",
            color: "var(--country-earth)",
          }}
        >
          <span>Sources &amp; Références</span>
          {hasSourceFlag && <SourceVerifyBadge />}
        </p>
      )}
      <ul className="flex flex-col gap-[6px]">
        {sources.map((source, index) => (
          <li
            key={`${source.label}-${index}`}
            className="flex items-baseline gap-2 flex-wrap"
          >
            <span
              data-source-standing={source.standing}
              className="shrink-0 rounded-full px-2 py-0.5 text-afh-eyebrow font-medium"
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
