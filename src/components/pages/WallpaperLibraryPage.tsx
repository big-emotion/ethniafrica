import Image from "next/image";

import { PageLayout } from "@/components/layout/PageLayout";
import {
  rungImage,
  scaleLadder,
  wallpaperLibrary,
} from "@/lib/i18n/copy/scaleLadder";
import type { Language } from "@/types/shared";

/**
 * The scale ladder, as a frieze you descend.
 *
 * **The image is the page.** Six full-bleed bands, one per rung, each a cut
 * through earth whose pale upper band shrinks as the rung goes deeper — so
 * scrolling is descending, and the visual thread carries the argument before
 * a word of it is read. The first version was a list of magnitudes with six
 * format buttons each, which read as a download table and not as a scale.
 *
 * **Text is centred and there is very little of it.** A magnitude, three
 * words of subject, one dated sentence, and where to check it. Anything more
 * competes with the picture a visitor came to take.
 *
 * **The page is still the payment.** A wallpaper leaves the site and is
 * re-shared; the rung beside it states the dated anchor that magnitude rests
 * on, and the two rungs the atlas does not itself carry wear a badge saying
 * so. A sourced neighbour does not get to vouch for them.
 *
 * No state and no JavaScript: six bands, one download each, every one a plain
 * anchor onto a static file.
 */
// @req REQ-132
export const WallpaperLibraryPage = ({ language }: { language: Language }) => {
  const ladder = scaleLadder[language];
  const chrome = wallpaperLibrary[language];

  return (
    <PageLayout language={language}>
      <div className="text-afh-text">
        <header className="mx-auto max-w-[46rem] space-y-afh-md pb-afh-2xl text-center">
          <p className="text-afh-eyebrow font-semibold uppercase tracking-wide text-afh-fg-muted">
            {chrome.eyebrow}
          </p>
          <h1 className="font-afh-display text-afh-hero font-black leading-none">
            {chrome.pageTitle}
          </h1>
          <p className="text-afh-lead font-semibold leading-relaxed">
            {ladder.intro}
          </p>
          <p className="text-afh-small text-afh-text-soft">
            {ladder.instruction}
          </p>
        </header>

        <ol
          data-testid="scale-ladder"
          className="ladder-frieze"
          aria-label={ladder.title}
        >
          {ladder.rungs.map((rung) => (
            <li
              key={rung.id}
              data-testid={`ladder-rung-${rung.id}`}
              className="relative isolate flex min-h-[26rem] flex-col items-center justify-end overflow-hidden text-center min-[720px]:min-h-[34rem]"
            >
              <Image
                src={rungImage(rung.id)}
                alt={chrome.imageAlt(rung.subject)}
                fill
                sizes="100vw"
                className="-z-10 object-cover"
              />
              {/*
                The scrim cannot depend on the picture behind it. Three of the
                six rungs are pale where the text sits, and light type on pale
                earth was unreadable before this was strengthened. It stays
                clear at the top so the band of fresh paper — the thing that
                shrinks as the ladder descends — is never hidden.
              */}
              <div
                aria-hidden="true"
                className="absolute inset-0 -z-10 bg-gradient-to-b from-[rgba(24,16,10,0.06)] via-[rgba(24,16,10,0.42)] to-[rgba(24,16,10,0.9)]"
              />

              <div className="flex w-full max-w-[34rem] flex-col items-center gap-afh-sm px-afh-md pb-afh-xl text-[#fffdf9]">
                <p className="font-afh-display text-afh-hero font-black leading-none drop-shadow-[0_2px_14px_rgba(24,16,10,0.6)]">
                  {rung.magnitude}
                </p>
                <p className="text-afh-caption font-bold uppercase tracking-[0.16em] opacity-90">
                  {rung.subject}
                </p>
                <p className="text-afh-small leading-relaxed drop-shadow-[0_1px_10px_rgba(24,16,10,0.75)]">
                  {rung.anchor}
                </p>
                <p
                  data-testid={`ladder-provenance-${rung.id}`}
                  className="text-afh-caption opacity-85"
                >
                  <b className="font-bold">
                    {rung.inAtlas ? chrome.inAtlas : chrome.outsideAtlas}
                  </b>{" "}
                  · {rung.provenance}
                </p>
                <a
                  href={rungImage(rung.id)}
                  download
                  aria-label={chrome.downloadLabel(rung.subject)}
                  className="mt-afh-xs inline-flex min-h-[44px] items-center border border-[#fffdf9] px-afh-md text-afh-small font-bold text-[#fffdf9]"
                >
                  {chrome.download}
                </a>
              </div>
            </li>
          ))}
        </ol>

        <p
          data-testid="ladder-reframe"
          className="mx-auto max-w-[40rem] pt-afh-2xl text-center font-afh-display text-afh-h2 font-black leading-tight"
        >
          {ladder.reframe}
        </p>

        <style>{`
          .ladder-frieze {
            width: 100vw;
            margin-left: calc(50% - 50vw);
            margin-right: calc(50% - 50vw);
            list-style: none;
            padding: 0;
          }
        `}</style>
      </div>
    </PageLayout>
  );
};
