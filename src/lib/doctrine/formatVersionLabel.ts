/**
 * Formats the doctrine version label as:
 *   "v{n} · publiée le {long French date}"
 *
 * Story ETNI-30 — version label AC.
 */
export function formatVersionLabel(
  version: number,
  publishedAt: string
): string {
  const date = new Date(publishedAt);
  const longFrenchDate = date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return `v${version} · publiée le ${longFrenchDate}`;
}
