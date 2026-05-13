import { SourceVerifyBadge } from "@/components/ui/source-verify-badge";

interface SourcesFooterProps {
  sources: string; // Already joined by " · "
  /** Story 0.20 (FR31): show a "source à vérifier" badge when truthy. */
  hasSourceFlag?: boolean;
}

export function SourcesFooter({ sources, hasSourceFlag }: SourcesFooterProps) {
  if (!sources) return null;

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
      <p>{sources}</p>
    </div>
  );
}
