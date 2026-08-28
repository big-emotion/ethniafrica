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
  if (!items.length) return null;

  return (
    <nav aria-label="Fil d'ariane" className="px-3 md:px-4 xl:px-5 mt-2 mb-1">
      <ol
        className="flex flex-wrap items-center gap-1 text-afh-caption"
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
