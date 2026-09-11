import { PageLayout } from "@/components/layout/PageLayout";
import { ChapterHeading } from "@/components/pages/ChapterHeading";
import { scaleLadder, wallpaperLibrary } from "@/lib/i18n/copy/scaleLadder";
import { WALLPAPER_FORMATS } from "@/lib/wallpaper/formats";
import type { Language } from "@/types/shared";

/**
 * The scale ladder, and the wallpaper of each rung.
 *
 * **The page is the payment, the image is the debt.** A sentence alone on a
 * screen opens a question; a poster that never answers it is a slogan, and on
 * an atlas whose product is provenance a slogan is a lie about the corpus. So
 * every image the library hands out states a magnitude, and the rung beside
 * the download states the dated anchor that magnitude rests on and where a
 * reader checks it. Nothing leaves this page unsourced.
 *
 * **Two of the six rungs the corpus does not carry.** They wear the badge that
 * says so. A sourced neighbour must not be allowed to vouch for them — the
 * Source Tier policy, one layer up: nothing is forbidden, everything is
 * labelled.
 *
 * No state and no JavaScript: six rungs, six links each, every one a plain
 * anchor onto the image route. The route names the file it returns, so a
 * reader gets `ethniafrica-kongo-phone.png` rather than `route.png`.
 *
 * The h1 names the page and the chapter carries the argument, the way `/about`
 * does. Both printed the ladder's own sentence at first, so the page said the
 * same thing twice before saying anything.
 */
// @req REQ-132
export const WallpaperLibraryPage = ({ language }: { language: Language }) => {
  const ladder = scaleLadder[language];
  const chrome = wallpaperLibrary[language];

  return (
    <PageLayout language={language}>
      <div className="mx-auto space-y-afh-6xl text-afh-text">
        <header className="space-y-afh-md border-b border-afh-border pb-afh-2xl">
          <p className="text-afh-eyebrow font-semibold uppercase tracking-wide text-afh-fg-muted">
            {chrome.eyebrow}
          </p>
          <h1 className="font-afh-display text-afh-hero font-black leading-none">
            {chrome.pageTitle}
          </h1>
          <p className="text-afh-lead font-semibold leading-relaxed">
            {ladder.intro}
          </p>
        </header>

        <section className="space-y-afh-xl" aria-labelledby="ladder-title">
          <div className="space-y-afh-md">
            <ChapterHeading
              id="ladder-title"
              stepLabel={ladder.stepLabel}
              heading={ladder.title}
            />
            <p className="text-afh-text-soft">{ladder.downloadNote}</p>
          </div>

          <ol
            data-testid="scale-ladder"
            className="grid grid-cols-1 gap-afh-md"
            role="list"
          >
            {ladder.rungs.map((rung) => (
              <li
                key={rung.id}
                data-testid={`ladder-rung-${rung.id}`}
                className="flex flex-col gap-afh-sm border-t-2 border-[var(--accent)] bg-afh-bg-warm px-afh-md py-afh-lg min-[720px]:flex-row min-[720px]:items-start min-[720px]:gap-afh-xl"
              >
                <div className="min-[720px]:w-[14rem] min-[720px]:shrink-0">
                  <p className="font-afh-display text-afh-h2 font-black leading-none">
                    {rung.magnitude}
                  </p>
                  <p className="mt-afh-xs text-afh-caption uppercase tracking-wide text-afh-text-soft">
                    {rung.subject}
                  </p>
                </div>

                <div className="flex flex-1 flex-col gap-afh-sm">
                  <p className="text-afh-small leading-relaxed">
                    {rung.anchor}
                  </p>
                  <p className="text-afh-caption text-afh-text-soft">
                    <span
                      data-testid={`ladder-provenance-${rung.id}`}
                      className="font-bold"
                    >
                      {rung.anchoredInCorpus
                        ? chrome.inCorpus
                        : chrome.outsideCorpus}
                    </span>{" "}
                    · {rung.provenance}
                  </p>
                  <ul
                    className="flex flex-wrap gap-afh-sm pt-afh-xs"
                    role="list"
                  >
                    {WALLPAPER_FORMATS.map((format) => (
                      <li key={format.id}>
                        <a
                          href={`/api/og/ladder?rung=${rung.id}&format=${format.id}&lang=${language}`}
                          download
                          aria-label={chrome.downloadLabel(
                            rung.subject,
                            chrome.formats[format.id] ?? format.id
                          )}
                          className="inline-flex min-h-[44px] items-center border border-afh-border px-afh-sm text-afh-caption font-bold text-[var(--accent-ink)]"
                        >
                          {chrome.formats[format.id] ?? format.id}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ol>

          <p
            data-testid="ladder-reframe"
            className="border-l-2 border-afh-gold pl-afh-md font-afh-display text-afh-h3 font-black leading-tight"
          >
            {ladder.reframe}
          </p>
        </section>
      </div>
    </PageLayout>
  );
};
