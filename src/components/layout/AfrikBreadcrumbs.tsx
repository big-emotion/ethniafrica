import Link from "next/link";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface AfrikBreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function AfrikBreadcrumbs({ items }: AfrikBreadcrumbsProps) {
  if (!items.length) return null;

  return (
    <nav aria-label="Fil d'ariane" className="px-3 md:px-4 xl:px-5 mt-2 mb-1">
      <ol
        className="flex flex-wrap items-center gap-1 text-[11px] md:text-[12px]"
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
                className="hover:underline hover:opacity-80 transition-opacity"
              >
                {item.label}
              </Link>
            ) : (
              <span className="font-medium opacity-80">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
