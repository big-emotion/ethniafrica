import Link from "next/link";
import { getLocalizedRoute } from "@/lib/routing";

export type DoctrineSlug =
  | "endonymes-vs-exonymes"
  | "classifications-contestees"
  | "heritage-colonial"
  | "topics-sensibles";

// @req REQ-019
export function isDoctrineSlug(value: string): value is DoctrineSlug {
  switch (value) {
    case "endonymes-vs-exonymes":
    case "classifications-contestees":
    case "heritage-colonial":
    case "topics-sensibles":
      return true;
    default:
      return false;
  }
}

export type DoctrineLinkCardProps = {
  slug: DoctrineSlug;
  /** When undefined, the link points to the live doctrine. */
  version?: number;
};

const DOCTRINE_COPY: Record<DoctrineSlug, string> = {
  "endonymes-vs-exonymes":
    "Cette fiche utilise endonymes (auto-désignations) et exonymes (désignations extérieures). Lisez la doctrine pour comprendre nos choix.",
  "classifications-contestees":
    "Cette classification fait l'objet de débats académiques et de positionnements éditoriaux. Voir la doctrine.",
  "heritage-colonial":
    "Ce terme provient de l'héritage colonial. Nous le conservons en l'expliquant. Voir la doctrine.",
  "topics-sensibles":
    "Ce sujet est sensible. Notre doctrine éditoriale encadre la rédaction. Voir la doctrine.",
};

// @req REQ-019
export function DoctrineLinkCard({ slug, version }: DoctrineLinkCardProps) {
  const copy = DOCTRINE_COPY[slug];
  const href =
    version !== undefined
      ? `${getLocalizedRoute("fr", "doctrine")}/${slug}@v${version}`
      : `${getLocalizedRoute("fr", "doctrine")}/${slug}`;

  return (
    <aside
      className="rounded-[var(--country-radius-xl,16px)] xl:rounded-[20px] px-[18px] py-[16px] md:px-[24px] md:py-[20px] xl:px-[28px] xl:py-[22px] text-afh-small leading-[1.6]"
      style={{
        backgroundColor: "var(--afh-bg-warm, var(--country-bg))",
        color: "var(--country-text, #1a1a1a)",
      }}
    >
      <p className="mb-[8px]">{copy}</p>
      <Link
        href={href}
        className="inline-block font-semibold underline underline-offset-2 hover:no-underline"
        style={{ color: "var(--country-earth, currentColor)" }}
      >
        Lire la doctrine
      </Link>
    </aside>
  );
}
