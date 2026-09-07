import Link from "next/link";
import { getLocalizedRoute } from "@/lib/routing";
import { FALLBACK_LOCALE } from "@/lib/locale";
import type { Language } from "@/types/shared";

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
  language?: Language;
};

const FR_DOCTRINE_COPY: Record<DoctrineSlug, string> = {
  "endonymes-vs-exonymes":
    "Cette fiche utilise endonymes (auto-désignations) et exonymes (désignations extérieures). Lisez la doctrine pour comprendre nos choix.",
  "classifications-contestees":
    "Cette classification fait l'objet de débats académiques et de positionnements éditoriaux. Voir la doctrine.",
  "heritage-colonial":
    "Ce terme provient de l'héritage colonial. Nous le conservons en l'expliquant. Voir la doctrine.",
  "topics-sensibles":
    "Ce sujet est sensible. Notre doctrine éditoriale encadre la rédaction. Voir la doctrine.",
};

const EN_DOCTRINE_COPY: Record<DoctrineSlug, string> = {
  "endonymes-vs-exonymes":
    "This fiche uses endonyms (self-designations) and exonyms (names given by others). Read the doctrine to understand our choices.",
  "classifications-contestees":
    "This classification is subject to academic debate and editorial positions. See the doctrine.",
  "heritage-colonial":
    "This term comes from the colonial legacy. We retain it with an explanation. See the doctrine.",
  "topics-sensibles":
    "This is a sensitive subject. Our editorial doctrine guides its treatment. See the doctrine.",
};

// @req REQ-019
export function DoctrineLinkCard({
  slug,
  version,
  language = FALLBACK_LOCALE,
}: DoctrineLinkCardProps) {
  const copy =
    language === "en" ? EN_DOCTRINE_COPY[slug] : FR_DOCTRINE_COPY[slug];
  const href =
    version !== undefined
      ? `${getLocalizedRoute(language, "doctrine")}/${slug}@v${version}`
      : `${getLocalizedRoute(language, "doctrine")}/${slug}`;

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
        {language === "en" ? "Read the doctrine" : "Lire la doctrine"}
      </Link>
    </aside>
  );
}
