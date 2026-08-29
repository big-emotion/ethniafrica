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
        className="flex flex-wrap items-center gap-1.5 text-afh-small"
        style={{ color: "var(--afh-text-soft, #9ca3af)" }}
      >
        {items.map((item, index) => (
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
                className="hover:underline hover:opacity-80 transition-opacity"
              >
                {item.label}
              </Link>
            ) : (
              // The crumb with no href is where the reader actually is, and it
              // was the only one dimmed — soft text made softer, which axe
              // reads as a serious contrast failure. It gets full ink instead;
              // the path back is the part that can afford to be quiet.
              <span
                className="font-medium"
                style={{ color: "var(--afh-text, #111827)" }}
                aria-current="page"
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
