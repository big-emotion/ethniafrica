import Link from "next/link";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface AfrikBreadcrumbsProps {
  items: BreadcrumbItem[];
}

// @req REQ-115
export function AfrikBreadcrumbs({ items }: AfrikBreadcrumbsProps) {
  // A trail that leads nowhere but here is not a trail. The home derives a
  // single crumb — itself, marked `aria-current` — so the shell used to print
  // a lone "Accueil" above the accueil. The test is the href rather than the
  // crumb count: a trail truncated on a segment it cannot name keeps every
  // href, and that lone way back is worth rendering.
  if (!items.some((item) => item.href)) return null;

  return (
    // Vertical rhythm only: the horizontal gutter belongs to whatever mounts
    // the trail, so it lines up with that surface's title and body instead of
    // stacking a second indent on top of the container's.
    <nav aria-label="Fil d'ariane" className="mt-2 mb-1">
      {/* The interface step, not the caption one. On the three facets the
          trail is the only thing naming the reader's position above a
          full-bleed globe, and 13px is the size reserved for an annotation
          under a figure — it read as a caption of the page rather than as the
          way back out of it. */}
      <ol
        // justify-*, not text-align: the site centres its text on a phone
        // by inheritance from `body` (styles/mobile-text.css), and a flex
        // row ignores that entirely. Without this the trail was the one
        // thing still hanging off the left edge on every route.
        className="flex flex-wrap items-center justify-center gap-1.5 text-afh-small md:justify-start"
        style={{ color: "var(--afh-text-soft, #9ca3af)" }}
      >
        {items.map((item, index) => {
          // Two crumbs render without an href and they mean opposite things.
          // The last one is where the reader stands. The other is the access
          // mode the page sits under — a heading, since ETNI-1555 removed the
          // axis landing pages it used to link to. Only the first may claim
          // `aria-current`, or the page is announced as being in two places.
          const isCurrent = !item.href && index === items.length - 1;

          return (
            <li key={index} className="flex items-center gap-1">
              {index > 0 && (
                <span aria-hidden="true" className="select-none opacity-50">
                  ›
                </span>
              )}
              {item.href ? (
                <Link
                  href={item.href}
                  prefetch={false}
                  // A crumb is a navigation control, not a word in a sentence,
                  // so it owes the 44px target the reading surface asks for —
                  // it measured 24px. The row keeps its height: the trail is
                  // laid out `items-center`, so a taller hit area centres on the
                  // same baseline the separators sit on.
                  className="inline-flex min-h-11 min-w-11 items-center justify-center hover:underline hover:opacity-80 transition-opacity"
                >
                  {item.label}
                </Link>
              ) : (
                // The reader's own crumb was the only one dimmed — soft text
                // made softer, which axe reads as a serious contrast failure.
                // It gets full ink instead; the path back is the part that can
                // afford to be quiet, and so is the axis heading beside it.
                <span
                  className={isCurrent ? "font-medium" : undefined}
                  style={
                    isCurrent
                      ? { color: "var(--afh-text, #111827)" }
                      : undefined
                  }
                  aria-current={isCurrent ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
