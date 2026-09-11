import Link from "next/link";

import {
  ChapterPlate,
  type PlateSource,
} from "@/components/pages/ChapterPlate";
import { MODULE_DEFINITIONS } from "@/lib/hubs/moduleRegistry";
import {
  aboutPage,
  aboutPlates,
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
 * /[lang]/about content — editorial family (charter §4/§7, FR107). Chapter
 * anatomy across its top-level sections; the prose carries no reading measure
 * and fills the page box it shares with its title.
 *
 * Trimmed twice, for the same reason each time: the page asked for more
 * reading than a visitor gives it.
 *
 * The first pass (2026-09-01) cut three blocks that duplicated content sitting
 * right next to them — the example-country cards, the interactive access cards
 * and the About/Doctrine distinction — and moved the source bibliography to
 * `/[lang]/sources`, because a reading list is not part of the project pitch.
 *
 * The second (2026-09-11) cut the three-block naming argument that sat between
 * chapters 01 and 02. It was the longest stretch of prose on the surface, and
 * nothing else imported it, so the component went with it. Three of its four
 * cleared images came back the same day as chapter plates: the argument they
 * carried was worth keeping, the three screens of prose around them were not.
 *
 * Every word now lives in `lib/i18n/copy/about.ts`, which is the slice that
 * file's own comment left for a later change.
 */

/**
 * The heading a subject card wears, from the registry that declares the class
 * rather than spelled again here.
 *
 * This page names what the atlas holds, and it spelled the six nouns beside
 * the six links; the links were derived and the headings were not, so the
 * headings were free to drift from the menu they mirror. They are the same
 * nouns the site's own description owes (siteDescription.test.ts).
 */
const corpusNoun = (page: PageType): string =>
  MODULE_DEFINITIONS.find(
    (module) => module.accessMode === "atlas" && module.page === page
  )?.corpusNoun ?? "";

/**
 * The plate that opens each chapter, and where its original lives. Three
 * registers on one surface, which is what the brand charter asks of any page
 * carrying more than one image: the colonial document, a people's own record,
 * and a map drawn from inside Africa.
 *
 * Provenance and the licence, read from the Commons API rather than assumed,
 * are kept for a maintainer in `public/images/home/CREDITS.md`.
 */
const PLATES: Record<string, PlateSource> = {
  ogilby: {
    id: "ogilby",
    src: "/images/home/guinea-ogilby-1670.jpg",
    width: 900,
    height: 595,
    sourceHref:
      "https://commons.wikimedia.org/wiki/File:1670_Ogilby_Map_of_West_Africa_(_Gold_Coast,_Slave_Coast,_Ivory_Coast_)_-_Geographicus_-_Guinea-ogilby-1670.jpg",
  },
  tifinagh: {
    id: "tifinagh",
    src: "/images/home/tifinagh-algeria.jpg",
    width: 900,
    height: 529,
    sourceHref: "https://commons.wikimedia.org/wiki/File:Tifinagh_Algeria.jpg",
    licenceHref: "https://creativecommons.org/licenses/by-sa/2.0/",
  },
  idrisi: {
    id: "idrisi",
    src: "/images/home/al-idrisi-1154.jpg",
    width: 960,
    height: 1046,
    sourceHref:
      "https://commons.wikimedia.org/wiki/File:Al-Idrisi%27s_world_map.JPG",
  },
};

/**
 * Which subject wears which accent, and where its link goes. Structure only —
 * every word is in the dictionary, so a copy change never reaches this file.
 */
const SUBJECTS: { key: string; page: PageType; accentClass: string }[] = [
  { key: "peoples", page: "peoples", accentClass: "afh-accent-ocre" },
  { key: "languages", page: "languages", accentClass: "afh-accent-language" },
  { key: "families", page: "families", accentClass: "afh-accent-terre" },
  { key: "countries", page: "countries", accentClass: "afh-accent-teal" },
  { key: "names", page: "names", accentClass: "afh-accent-neutral" },
  { key: "patronymes", page: "patronymes", accentClass: "afh-accent-name" },
];

// @req REQ-091 @req REQ-132
export default function AboutPageContent({ language }: AboutPageContentProps) {
  const t = aboutPage[language];
  const purpose = purposeChapter[language];
  const steps = chapterSteps[language];
  const plates = aboutPlates[language];

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
          {t.overview.asideLead} {t.overview.asideNote}{" "}
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
        <ChapterPlate plate={PLATES.ogilby} copy={plates.ogilby} />
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

      <section className="space-y-afh-xl" aria-labelledby="about-content-title">
        <ChapterPlate plate={PLATES.tifinagh} copy={plates.tifinagh} />
        <div className="space-y-afh-md">
          <ChapterHeading
            id="about-content-title"
            stepLabel={steps.corpus}
            heading={t.contents.title}
          />
          <p className="text-afh-text-soft">{t.contents.intro}</p>
        </div>
        <ul
          data-testid="about-content-families"
          className="grid grid-cols-1 gap-afh-md min-[720px]:grid-cols-2 min-[1240px]:grid-cols-5"
          role="list"
        >
          {SUBJECTS.map((subject) => {
            const copy = t.contents.subjects[subject.key];
            return (
              <li
                key={subject.key}
                className={`${subject.accentClass} flex min-h-full flex-col border-t-2 border-[var(--accent)] bg-afh-bg-warm px-afh-md py-afh-lg`}
              >
                <h3 className="font-afh-display text-afh-h3 font-black">
                  {corpusNoun(subject.page)}
                </h3>
                <p className="mt-afh-sm flex-1 text-afh-small leading-relaxed text-afh-text-soft">
                  {copy.description}
                </p>
                <Link
                  href={getLocalizedRoute(language, subject.page)}
                  className="mt-afh-md inline-flex min-h-[44px] items-center border-t border-afh-border pt-afh-sm text-afh-small font-bold text-[var(--accent-ink)] underline decoration-[var(--accent)] underline-offset-4"
                >
                  {copy.linkLabel}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section
        className="about-axes-section space-y-afh-2xl"
        aria-labelledby="about-access-title"
      >
        <div className="mx-auto max-w-[1140px] space-y-afh-xl">
          <ChapterPlate plate={PLATES.idrisi} copy={plates.idrisi} />
          <div className="space-y-afh-md">
            <ChapterHeading
              id="about-access-title"
              stepLabel={steps.accessModes}
              heading={t.accessModes.title}
            />
            <p className="text-afh-text-soft">{t.accessModes.intro}</p>
          </div>
          <ul
            data-testid="about-access-mode-list"
            className="grid grid-cols-1 gap-afh-md min-[720px]:grid-cols-3"
            role="list"
          >
            {accessModeCards[language].map((mode) => (
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
