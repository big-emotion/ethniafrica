import Image from "next/image";
import Link from "next/link";

import {
  getCountryRoute,
  getLocalizedRoute,
  getPeopleRoute,
} from "@/lib/routing";
import type { Language } from "@/types/shared";

export interface PurposeBlocksProps {
  language: Language;
}

/**
 * Why this atlas exists, argued by example rather than by claim.
 *
 * Three cases, rising in strangeness: a country named after a commodity, a
 * people carrying an exonym received as pejorative, and a language family
 * long read as a people. Each block states what the corpus states and no
 * more — "an insult", "a people that never existed" and "Bleek had not yet
 * met a speaker" were the home's own flourishes, sharper than the fiches
 * they send the reader to and, in Bleek's case, false: he wrote the 1862
 * grammar from Cape Town. Between them
 * they teach the atlas's three levels — country, people, language family —
 * without naming them as levels, and each block carries the accent of the
 * entity it is about (atlas-charter §2, home mapping: people ocre, country
 * teal, family terre). A reader meets the colour grammar here, before ever
 * reaching a fiche.
 *
 * The images are documents, not decoration: a 1670 map that labels the coast
 * by its merchandise, and the writing of a people the Greeks called
 * "those who do not speak our language". Provenance and licences are in
 * public/images/home/CREDITS.md; the CC BY-SA credit is rendered below its
 * figure because the licence requires it to be visible.
 */

interface PurposeBlock {
  id: string;
  accentClass: string;
  kicker: string;
  title: string;
  claim: React.ReactNode;
  followUp: string;
  cta: { label: string; href: (language: Language) => string };
  image: { src: string; alt: string; credit: string; portrait?: boolean };
}

const BLOCKS: PurposeBlock[] = [
  {
    id: "country",
    accentClass: "afh-accent-teal",
    kicker: "Un pays",
    title: "Le nom d'un pays a une date et un auteur.",
    claim: (
      <>
        « Côte d&apos;Ivoire » n&apos;est pas un nom ivoirien. Les navigateurs
        portugais du XV<sup>e</sup> siècle désignent ce littoral par sa
        marchandise : <em>Costa do Marfim</em>, la côte de l&apos;ivoire. En
        1839, l&apos;officier français Bouët-Willaumez en fixe la forme
        française.
      </>
    ),
    followUp:
      "Aucun nom de pays n'est spontané : quelqu'un l'a choisi, à une date, pour un motif. L'atlas restitue les trois quand les sources les établissent.",
    cta: {
      label: "Lire la fiche Côte d'Ivoire",
      href: (language) => getCountryRoute(language, "CIV"),
    },
    image: {
      src: "/images/home/guinea-ogilby-1670.jpg",
      alt: "Carte de la Guinée gravée en 1670 : la côte y est nommée par ses marchandises, et le cartouche est tenu par une défense d'éléphant.",
      credit: "John Ogilby, Guinea, 1670 — Wikimedia Commons, domaine public",
    },
  },
  {
    id: "people",
    accentClass: "afh-accent-ocre",
    kicker: "Un peuple",
    title:
      "Certains noms sont des termes péjoratifs qu'on n'entend plus comme tels.",
    claim: (
      <>
        « Berbère » remonte au grec <em>barbaros</em>, celui dont on ne comprend
        pas la langue, puis au latin <em>barbarus</em>, que les Romains
        appliquent aux populations non latines d&apos;Afrique du Nord. Les
        auteurs arabes médiévaux le reprennent, l&apos;administration coloniale
        française en fait une catégorie. Ces peuples se nomment{" "}
        <strong>Amazigh</strong> — Imazighen au pluriel : « hommes libres ».
      </>
    ),
    followUp:
      "Un exonyme est le nom donné de l'extérieur ; un autonyme, celui qu'un peuple se donne. L'atlas donne les deux quand il les connaît, et signale ceux qui sont contestés.",
    cta: {
      label: "Lire la fiche Amazigh",
      href: (language) => getPeopleRoute(language, "PPL_AMAZIGH_MACRO"),
    },
    image: {
      src: "/images/home/tifinagh-algeria.jpg",
      alt: "Inscriptions en tifinagh gravées dans la roche, en Algérie.",
      credit: "Inscriptions tifinagh, Algérie — Patrick Gruban, CC BY-SA 2.0",
    },
  },
  {
    id: "family",
    accentClass: "afh-accent-terre",
    kicker: "Une famille de langues",
    title: "Et parfois, ce qu'on appelle un peuple est une famille de langues.",
    // « ba-ntu : ba- » holds its space before the colon only because that
    // text node stays on one source line. The JSX transform strips the
    // leading space of a text node that wraps across lines, so reflowing
    // this claim silently produces « ba-ntu: ba- ». Keep the colon and its
    // neighbours together, or write the space as {" "}.
    claim: (
      <>
        « Bantou » ne désigne pas un peuple. Le philologue allemand Wilhelm
        Bleek forge le terme en 1862, dans{" "}
        <em>A Comparative Grammar of South African Languages</em>, à partir de{" "}
        <em>ba-ntu</em> : <em>ba-</em>, préfixe de pluriel humain, <em>-ntu</em>
        , la personne. Il nomme une parenté entre plus de 500 langues, pas une
        identité.
      </>
    ),
    followUp:
      "Une famille de langues, un peuple, un pays : trois objets distincts, que l'administration coloniale a confondus. L'atlas les tient séparés, et dit lequel il décrit.",
    cta: {
      label: "Explorer les familles linguistiques",
      href: (language) => getLocalizedRoute(language, "families"),
    },
    image: {
      src: "/images/home/wilhelm-bleek.jpg",
      alt: "Portrait photographique de Wilhelm Bleek, le philologue allemand qui a forgé le terme « bantou » en 1862.",
      credit: "Wilhelm Bleek (1827–1875) — Wikimedia Commons, domaine public",
      portrait: true,
    },
  },
];

// @req REQ-113
export function PurposeBlocks({ language }: PurposeBlocksProps) {
  return (
    <section className="home-purpose" data-testid="home-purpose-blocks">
      {BLOCKS.map((block, index) => (
        <div
          key={block.id}
          className={`home-purpose-row ${block.accentClass} ${
            index % 2 === 1 ? "is-reversed" : ""
          }`}
        >
          <figure
            className={`home-purpose-fig ${block.image.portrait ? "is-portrait" : ""}`}
          >
            <Image
              src={block.image.src}
              alt={block.image.alt}
              width={block.image.portrait ? 340 : 900}
              height={block.image.portrait ? 424 : 595}
              sizes="(min-width: 720px) 46vw, 92vw"
            />
            <figcaption>{block.image.credit}</figcaption>
          </figure>

          <div className="home-purpose-body">
            <p className="home-purpose-kicker">
              <span aria-hidden="true" className="home-purpose-dot" />
              {block.kicker}
            </p>
            <h2>{block.title}</h2>
            <p className="home-purpose-claim">{block.claim}</p>
            <p>{block.followUp}</p>
            <Link className="home-purpose-cta" href={block.cta.href(language)}>
              {block.cta.label}
              <span aria-hidden="true"> →</span>
            </Link>
          </div>
        </div>
      ))}

      <style>{`
        .home-purpose {
          background: var(--afh-bg);
          padding: 44px 22px 40px;
          display: flex;
          flex-direction: column;
          gap: 48px;
          width: 100vw;
          margin-left: calc(50% - 50vw);
          margin-right: calc(50% - 50vw);
        }
        .home-purpose-row {
          display: flex;
          flex-direction: column;
          gap: 20px;
          max-width: 1100px;
          margin: 0 auto;
          width: 100%;
        }
        .home-purpose-fig {
          margin: 0;
          background: var(--afh-color-card);
          border: 1px solid var(--afh-border);
          border-radius: 6px;
          overflow: hidden;
        }
        .home-purpose-fig img {
          display: block;
          width: 100%;
          height: auto;
          aspect-ratio: 3 / 2;
          object-fit: cover;
          object-position: center 42%;
        }
        /* Bleek's portrait is 183px wide at source. Shown small and centred
           on the warm ground it reads as the 19th-century carte de visite it
           is; stretched to the figure's width it would just be blurry. */
        .home-purpose-fig.is-portrait {
          background: var(--afh-bg-warm);
          display: flex;
          flex-direction: column;
          align-items: center;
          padding-top: 26px;
        }
        .home-purpose-fig.is-portrait img {
          width: 132px;
          aspect-ratio: auto;
          border: 1px solid var(--afh-border);
          border-radius: 2px;
          margin-bottom: 22px;
        }
        .home-purpose-fig figcaption {
          padding: 9px 13px;
          border-top: 1px solid var(--afh-border);
          background: var(--afh-bg);
          font-family: var(--font-mono, ui-monospace, monospace);
          font-size: var(--afh-text-eyebrow);
          line-height: 1.5;
          color: var(--afh-text-muted);
          width: 100%;
          box-sizing: border-box;
        }
        .home-purpose-kicker {
          display: flex;
          align-items: center;
          gap: 7px;
          margin: 0;
          font-family: var(--font-mono, ui-monospace, monospace);
          font-size: var(--afh-text-eyebrow);
          font-weight: 500;
          letter-spacing: 0.11em;
          text-transform: uppercase;
          color: var(--accent-ink);
        }
        .home-purpose-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--accent);
          flex: none;
        }
        .home-purpose-body h2 {
          margin: 12px 0;
          font-family: var(--font-fraunces), Georgia, serif;
          font-size: var(--afh-text-h2);
          font-weight: 600;
          line-height: 1.14;
          letter-spacing: -0.012em;
          color: var(--afh-text);
          text-wrap: balance;
        }
        .home-purpose-body p {
          margin: 0 0 12px;
          font-size: var(--afh-text-body);
          line-height: 1.62;
          color: var(--afh-text-soft);
        }
        .home-purpose-body .home-purpose-claim {
          color: var(--afh-text);
        }
        .home-purpose-cta {
          display: inline-block;
          font-size: var(--afh-text-small);
          font-weight: 700;
          color: var(--accent-ink);
          text-decoration: none;
          border-bottom: 1.5px solid currentColor;
          padding-bottom: 1px;
        }
        .home-purpose-cta:hover,
        .home-purpose-cta:focus-visible {
          border-bottom-color: var(--accent);
        }
        @media (min-width: 720px) {
          .home-purpose {
            padding: 64px 40px 56px;
            gap: 68px;
          }
          .home-purpose-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 48px;
            align-items: center;
          }
          .home-purpose-row.is-reversed .home-purpose-fig { order: 2; }
        }
      `}</style>
    </section>
  );
}
