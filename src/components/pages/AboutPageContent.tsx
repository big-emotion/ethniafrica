import Link from "next/link";

import { PurposeBlocks } from "@/components/home/PurposeBlocks";
import { MODULE_DEFINITIONS } from "@/lib/hubs/moduleRegistry";
import {
  accessModeCards,
  chapterSteps,
  purposeChapter,
} from "@/lib/i18n/copy/about";
import { getLocalizedRoute, type PageType } from "@/lib/routing";
import type { Language } from "@/types/shared";
import { ChapterHeading } from "@/components/pages/ChapterHeading";

interface AboutPageContentProps {
  language: Language;
}

/**
 * /[lang]/about content — editorial family (charter §4/§7, FR107). Gains
 * chapter anatomy across its top-level sections; the prose carries no reading
 * measure and fills the page box it shares with its title.
 * Institution/region group labels (formerly H4) are plain text: H3 is the
 * deepest heading this long-form exception allows.
 *
 * Trimmed of three blocks that duplicated content sitting right next to them
 * (2026-09-01): the three example-country cards restated "01 · Le corpus",
 * the interactive access cards restated "Trois manières d'entrer dans
 * l'atlas", and the About/Doctrine distinction restated the doctrine link
 * then offered from the footer's "Le projet" rubric. The source
 * bibliography moved to its own page, `/[lang]/sources`, reachable from the
 * footer's "Le projet" rubric — a reading list is not part of the project
 * pitch. The doctrine link itself moved the other way (2026-09-05): out of
 * that footer column and in here, inline, as the one place the chrome names
 * it at all.
 */
/**
 * The heading a corpus-class card wears, from the registry that declares the
 * class rather than spelled again here.
 *
 * This page names what the corpus holds, and it spelled the six nouns beside
 * the six links; the links were derived and the headings were not, so the
 * headings were free to drift from the menu they mirror. They are the same
 * nouns the site's own description owes (siteDescription.test.ts).
 */
const corpusNoun = (page: PageType): string =>
  MODULE_DEFINITIONS.find(
    (module) => module.accessMode === "atlas" && module.page === page
  )?.corpusNoun ?? "";

// @req REQ-091 @req REQ-132
export default function AboutPageContent({ language }: AboutPageContentProps) {
  const content = {
    en: {
      title: "About",
      overview: {
        eyebrow: "The project",
        lead: "EthniAfrica is an editorial atlas dedicated to the peoples of Africa and to the countries, languages, language families, names and designations documented by the corpus.",
        body: "The corpus connects these six fiche types so readers can locate them without confusing them. It is built progressively from documented information made accessible in one place.",
        doctrineNote: "The choices that govern it are set out in the",
        doctrineLinkLabel: "editorial doctrine",
      },
      contentFamilies: {
        stepLabel: chapterSteps.en.corpus,
        title: "What EthniAfrica contains",
        intro:
          "Six distinct subjects structure the corpus. Each fiche can link to the others when the relationship is documented.",
        items: [
          {
            title: "Peoples",
            description:
              "Fiches dedicated to peoples, their names and the relationships documented in the corpus.",
            accentClass: "afh-accent-ocre",
            page: "peoples" as PageType,
            linkLabel: "Browse peoples",
          },
          {
            title: "Languages",
            description:
              "Languages are presented as subjects in their own right and connected to the relevant peoples and families.",
            accentClass: "afh-accent-language",
            page: "languages" as PageType,
            linkLabel: "Browse languages",
          },
          {
            title: "Language families",
            description:
              "Language groupings have their own fiches and are not treated as peoples.",
            accentClass: "afh-accent-terre",
            page: "families" as PageType,
            linkLabel: "Browse families",
          },
          {
            title: "Countries",
            description:
              "Country fiches provide the territorial framework in which the corpus locates its other entries.",
            accentClass: "afh-accent-teal",
            page: "countries" as PageType,
            linkLabel: "Browse countries",
          },
          {
            title: "Designations",
            description:
              "Self-designations, exonyms and other documented names are presented with their context and provenance.",
            accentClass: "afh-accent-neutral",
            page: "names" as PageType,
            linkLabel: "Browse designations",
          },
          {
            title: "Personal names",
            description:
              "Personal naming systems — clan names, nisbas and praise names — which cannot all be read as European-style surnames.",
            accentClass: "afh-accent-name",
            page: "patronymes" as PageType,
            linkLabel: "Browse names",
          },
        ],
      },
      accessModes: {
        stepLabel: chapterSteps.en.accessModes,
        title: "Three ways into the atlas",
        intro:
          "The same corpus can be explored according to the reader's intent: find a fiche, investigate a question or test their bearings.",
        items: accessModeCards.en,
      },
    },
    fr: {
      title: "À propos",
      overview: {
        eyebrow: "Le projet",
        lead: "EthniAfrica est un atlas éditorial en français consacré aux peuples d’Afrique et aux pays, langues, familles linguistiques, appellations et noms documentés par le corpus.",
        body: "Le corpus relie ces six types de fiches pour permettre de les situer sans les confondre. Il se construit progressivement, à partir d’informations documentées et rendues accessibles dans un même espace de consultation.",
        doctrineNote: "Les choix qui le gouvernent sont énoncés dans la",
        doctrineLinkLabel: "doctrine éditoriale",
      },
      contentFamilies: {
        stepLabel: chapterSteps.fr.corpus,
        title: "Ce que contient EthniAfrica",
        intro:
          "Six objets distincts structurent le corpus. Chaque fiche peut renvoyer vers les autres lorsque la relation est documentée.",
        items: [
          {
            title: corpusNoun("peoples"),
            description:
              "Des fiches consacrées aux peuples, à leurs appellations et aux relations documentées dans le corpus.",
            accentClass: "afh-accent-ocre",
            page: "peoples" as PageType,
            linkLabel: "Parcourir les peuples",
          },
          {
            title: corpusNoun("languages"),
            description:
              "Les langues sont présentées comme des objets propres et reliées aux peuples et aux familles concernées.",
            // The one card that named a class and offered no way into it: it
            // was written before the languages index existed (ETNI-1802), and
            // nothing sent the reader there once it did.
            accentClass: "afh-accent-language",
            page: "languages" as PageType,
            linkLabel: "Parcourir les langues",
          },
          {
            title: corpusNoun("families"),
            description:
              "Les regroupements linguistiques disposent de leurs propres fiches et ne sont pas assimilés à des peuples.",
            accentClass: "afh-accent-terre",
            page: "families" as PageType,
            linkLabel: "Parcourir les familles",
          },
          {
            title: corpusNoun("countries"),
            description:
              "Les fiches pays donnent le cadre territorial dans lequel le corpus situe ses autres entrées.",
            accentClass: "afh-accent-teal",
            page: "countries" as PageType,
            linkLabel: "Parcourir les pays",
          },
          {
            title: corpusNoun("names"),
            description:
              "Les autonymes, les exonymes et les autres appellations documentées sont présentés avec leur contexte et leur provenance.",
            accentClass: "afh-accent-neutral",
            page: "names" as PageType,
            linkLabel: "Parcourir les appellations",
          },
          {
            title: corpusNoun("patronymes"),
            // Distinct from Appellations directly above, and the page is where
            // a reader is most likely to conflate the two: one names a people,
            // the other names a person. Said here rather than left to the two
            // titles to imply.
            description:
              "Les systèmes de nommage des personnes — noms de clan, nisba, noms d’éloge — qui ne se lisent pas tous comme un nom de famille européen.",
            accentClass: "afh-accent-name",
            page: "patronymes" as PageType,
            linkLabel: "Parcourir les noms",
          },
        ],
      },
      accessModes: {
        stepLabel: chapterSteps.fr.accessModes,
        title: "Trois manières d’entrer dans l’atlas",
        intro:
          "Le même corpus se parcourt selon l’intention du moment : chercher une fiche, approfondir une question ou mettre ses repères à l’épreuve.",
        // Each description lists the modules the axis actually holds, doing
        // the same job as the header panel's `menuBlurb`: a reader who has
        // not opened the menu meets the three axes here first, and the
        // previous wording stated the intention behind an axis without ever
        // saying what was behind it.
        //
        // The cards themselves live in `lib/i18n/copy/about` — they had to
        // change when the Mercator game was renamed, and reader-facing copy
        // that changes belongs in a dictionary where the parity gate can see
        // both locales. The rest of this file's copy is a later slice.
        items: accessModeCards.fr,
      },
    },
  };

  const t = content[language];
  const purpose = purposeChapter[language];

  return (
    <div className="mx-auto space-y-afh-6xl text-afh-text">
      <header
        data-testid="about-overview"
        className="grid gap-afh-xl border-b border-afh-border pb-afh-2xl min-[1240px]:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)] min-[1240px]:items-end min-[1240px]:gap-afh-5xl"
      >
        <div className="space-y-afh-md">
          <p className="text-afh-eyebrow font-semibold uppercase tracking-wide text-afh-fg-muted">
            {t.overview.eyebrow}
          </p>
          <h1 className="font-afh-display text-afh-hero font-black leading-none">
            {t.title}
          </h1>
          <p className="text-afh-lead font-semibold leading-relaxed">
            {t.overview.lead}
          </p>
        </div>
        <p className="border-l-2 border-afh-gold pl-afh-md text-afh-small leading-relaxed text-afh-text-soft">
          {t.overview.body} {t.overview.doctrineNote}{" "}
          <Link
            href={getLocalizedRoute(language, "doctrine")}
            className="font-bold text-[var(--accent-ink)] underline decoration-[var(--accent)] underline-offset-4"
          >
            {t.overview.doctrineLinkLabel}
          </Link>
          .
        </p>
      </header>

      <section
        data-testid="about-purpose"
        className="space-y-afh-xl"
        aria-labelledby="about-purpose-title"
      >
        <ChapterHeading
          id="about-purpose-title"
          stepLabel={purpose.stepLabel}
          heading={purpose.title}
        />
        <div className="space-y-afh-sm border-l-2 border-afh-gold pl-afh-md">
          <p className="font-afh-display text-afh-h2 font-black leading-tight">
            {purpose.claim}
          </p>
          <p
            data-testid="about-purpose-claim-status"
            className="text-afh-small leading-relaxed text-afh-text-soft"
          >
            {purpose.claimStatus}
          </p>
        </div>
        <ul
          className="grid grid-cols-1 gap-afh-md min-[720px]:grid-cols-3"
          role="list"
        >
          {purpose.scales.map((scale) => (
            <li
              key={scale.title}
              className="flex min-h-full flex-col border-t-2 border-[var(--accent)] bg-afh-bg-warm px-afh-md py-afh-lg"
            >
              <h3 className="font-afh-display text-afh-h3 font-black">
                {scale.title}
              </h3>
              <p className="mt-afh-sm flex-1 text-afh-small leading-relaxed text-afh-text-soft">
                {scale.body}
              </p>
            </li>
          ))}
        </ul>
        <p className="text-afh-small leading-relaxed text-afh-text-soft">
          {purpose.closing}
        </p>
      </section>

      <PurposeBlocks language={language} />

      <section className="space-y-afh-xl" aria-labelledby="about-content-title">
        <div className="space-y-afh-md">
          <ChapterHeading
            id="about-content-title"
            stepLabel={t.contentFamilies.stepLabel}
            heading={t.contentFamilies.title}
          />
          <p className="text-afh-text-soft">{t.contentFamilies.intro}</p>
        </div>
        <ul
          data-testid="about-content-families"
          className="grid grid-cols-1 gap-afh-md min-[720px]:grid-cols-2 min-[1240px]:grid-cols-5"
          role="list"
        >
          {t.contentFamilies.items.map((family) => (
            <li
              key={family.title}
              className={`${family.accentClass} flex min-h-full flex-col border-t-2 border-[var(--accent)] bg-afh-bg-warm px-afh-md py-afh-lg`}
            >
              <h3 className="font-afh-display text-afh-h3 font-black">
                {family.title}
              </h3>
              <p className="mt-afh-sm flex-1 text-afh-small leading-relaxed text-afh-text-soft">
                {family.description}
              </p>
              {family.page && family.linkLabel ? (
                <Link
                  href={getLocalizedRoute(language, family.page)}
                  className="mt-afh-md inline-flex min-h-[44px] items-center border-t border-afh-border pt-afh-sm text-afh-small font-bold text-[var(--accent-ink)] underline decoration-[var(--accent)] underline-offset-4"
                >
                  {family.linkLabel}
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section
        className="about-axes-section space-y-afh-2xl"
        aria-labelledby="about-access-title"
      >
        <div className="mx-auto max-w-[1140px] space-y-afh-xl">
          <div className="space-y-afh-md">
            <ChapterHeading
              id="about-access-title"
              stepLabel={t.accessModes.stepLabel}
              heading={t.accessModes.title}
            />
            <p className="text-afh-text-soft">{t.accessModes.intro}</p>
          </div>
          <ul
            data-testid="about-access-mode-list"
            className="grid grid-cols-1 gap-afh-md min-[720px]:grid-cols-3"
            role="list"
          >
            {t.accessModes.items.map((mode) => (
              <li
                key={mode.id}
                data-testid={`about-access-mode-${mode.id}`}
                className={`${mode.accentClass} border-l-2 border-[var(--accent)] pl-afh-md text-afh-small leading-relaxed text-afh-text-soft`}
              >
                <p className="font-bold text-afh-text">{mode.label}</p>
                <p
                  data-testid={`about-access-mode-description-${mode.id}`}
                  className="mt-afh-xs"
                >
                  {mode.description}
                </p>
              </li>
            ))}
          </ul>
        </div>
        <style>{`
          .about-axes-section {
            background: var(--afh-bg);
            padding: 30px 20px 44px;
            width: 100vw;
            margin-left: calc(50% - 50vw);
            margin-right: calc(50% - 50vw);
          }
          @media (min-width: 720px) {
            .about-axes-section { padding: 40px 24px 60px; }
          }
        `}</style>
      </section>
    </div>
  );
}
