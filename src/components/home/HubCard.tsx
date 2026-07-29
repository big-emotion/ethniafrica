import Link from "next/link";
import type { AccessModeHub } from "@/lib/accessModeHubs";

interface HubCardProps {
  hub: AccessModeHub;
}

export function HubCard({ hub }: HubCardProps) {
  return (
    <div
      className="rounded-[14px] border p-6"
      style={{
        backgroundColor: "var(--afh-night-surface-2)",
        borderColor: "var(--afh-night-line)",
        borderWidth: "1px",
      }}
    >
      <h3
        className="text-lg font-semibold"
        style={{ color: "var(--afh-night-ink)" }}
      >
        {hub.title}
      </h3>
      <p className="mt-2 text-sm" style={{ color: "var(--afh-night-ink-2)" }}>
        {hub.description}
      </p>
      <ul className="mt-4 flex flex-wrap gap-2">
        {hub.surfaces.map((surface) => (
          <li key={surface.page}>
            <Link
              href={surface.href}
              className="inline-flex items-center rounded-full border px-3 py-2 text-sm font-medium"
              style={{
                borderColor: "var(--afh-night-line)",
                color: "var(--afh-night-ink)",
              }}
            >
              {surface.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
