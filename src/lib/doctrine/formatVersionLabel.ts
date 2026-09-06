/**
 * Formats the doctrine version label as:
 *   "v{n} · publiée le {long French date}"
 *
 * Story ETNI-30 — version label AC.
 *
 * @req REQ-025
 */
export function formatVersionLabel(
  version: number,
  publishedAt: string,
  language: Language = "fr"
): string {
  const date = new Date(publishedAt);
  const longDate = date.toLocaleDateString(
    language === "en" ? "en-GB" : "fr-FR",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }
  );
  return language === "en"
    ? `v${version} · published ${longDate}`
    : `v${version} · publiée le ${longDate}`;
}
import type { Language } from "@/types/shared";
