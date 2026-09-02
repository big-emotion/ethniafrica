import Link from "next/link";

import type { Source } from "@/api/v2/schemas/sources";
import { SourceStandingBadge } from "@/components/sources/SourceStandingBadge";
import { getSourceRoute } from "@/lib/routing";
import { isSourceTier } from "@/types/sources";

interface SourceRowProps {
  source: Source;
}

/** "SIL International · 2024", with whichever half the citation carries. */
function attributionOf(source: Source): string | null {
  const parts = [source.author, source.year ? String(source.year) : null];
  const present = parts.filter(Boolean);
  return present.length > 0 ? present.join(" · ") : null;
}

/**
 * One source in the directory.
 *
 * A flat row rather than a card, and the difference is not cosmetic: a card is
 * the atlas's unit of *content*, and a source is not content — it is the
 * apparatus the content rests on. Reading the bibliography as a document keeps
 * the two registers apart, and it is what `actions-charter.md` §6 means by
 * giving the citation layer the square corner.
 *
 * The whole row is one anchor, to the source's own page rather than to the
 * work itself. Sending the reader off-site at the moment they ask what the
 * corpus rests on would answer a different question than the one they asked;
 * the outward link belongs on the source's page, beside what cites it.
 */
// @req REQ-092
export function SourceRow({ source }: SourceRowProps) {
  const attribution = attributionOf(source);
  const standing = isSourceTier(source.tier) ? source.tier : "needs_review";

  return (
    <Link
      href={getSourceRoute("fr", source.id)}
      prefetch={false}
      className="block border-b border-afh-border px-1 py-4 focus-visible:outline-none focus-visible:shadow-[var(--afh-ring-focus)]"
    >
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <SourceStandingBadge standing={standing} />
        <span className="font-afh text-afh-body text-afh-text">
          {source.title}
        </span>
      </div>
      {attribution && (
        <p className="mt-1 text-afh-small text-afh-text-soft">{attribution}</p>
      )}
      {source.notes && (
        <p className="mt-1 text-afh-caption text-afh-text-soft">
          {source.notes}
        </p>
      )}
    </Link>
  );
}
