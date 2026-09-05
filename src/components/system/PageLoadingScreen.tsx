import { headers } from "next/headers";

import { PageLayout } from "@/components/layout/PageLayout";
import { DidYouKnowLoader } from "@/components/system/DidYouKnowLoader";
import { pickDidYouKnowFact } from "@/lib/home/didYouKnowFacts";
import { LOCALE_HEADER, resolveLocale } from "@/lib/locale";

export interface PageLoadingScreenProps {
  /**
   * What is being waited for, in the reader's words — "Chargement du quiz",
   * not "Chargement". A screen reader announces this and nothing else, so a
   * bare "loading" leaves its user with less than the sighted reader gets
   * from the surrounding page.
   */
  label: string;
}

/**
 * The wait state of an ordinary page (REQ-104).
 *
 * `FicheLoadingScreen` answers the same need on the three fiche routes, and
 * the two now differ only in the accent they wait in. What they share is the
 * part that matters — `DidYouKnowLoader`, one onomastic fact unveiled at
 * reading pace, so every wait on the site is spent on the same thing rather
 * than on a component kit's spinner.
 *
 * The fact is drawn here rather than passed in, because a loading file has no
 * request context of its own to draw from and every caller would otherwise
 * repeat the same three lines.
 *
 * The shell is `PageLayout`, so React reconciles the two trees when the page
 * resolves and the header, the search modal and the footer are never
 * unmounted: the reader keeps their orientation across the navigation
 * (REQ-098). A loading file that rendered bare content would blank the
 * navigation bar for the length of the wait and bring it back — the page
 * would appear to reload.
 *
 * It carries no page identity, though: no section name, so no title plate,
 * and no trail (brand charter §8.4). Both used to be drawn here, and on
 * `/fr/atlas` the plate alone took the top of the fold from the one thing
 * the wait exists to show. Neither names a page the reader has arrived at,
 * and the client overlay that covers the segments a boundary would damage
 * has never drawn either.
 *
 * Nothing is painted for the first 300 ms; see `LOADER_REVEAL_DELAY_MS`. A
 * page that resolves quickly therefore shows no indicator at all, which is
 * the point: an indicator inside that window is a flash, not information.
 *
 * A `loading.tsx` receives no params, so the shell's locale comes off the
 * `x-locale` request header the middleware sets — the same one the root
 * layout reads for `<html lang>`. Absent, the default locale.
 */
// @req REQ-098
// @req REQ-104
export async function PageLoadingScreen({ label }: PageLoadingScreenProps) {
  const requestHeaders = await headers();
  const language = resolveLocale(
    requestHeaders.get(LOCALE_HEADER) ?? undefined
  );

  return (
    <PageLayout language={language} hideHeader hideTrail>
      {/* The accent scope is not decoration here. `--accent` is declared twice
          under two incompatible meanings — shadcn's bare HSL triplet in
          index.css, a hex on the .afh-accent-* wrappers in color.css — and
          outside a wrapper the triplet wins, so `fill: var(--accent)` resolves
          to nothing and the continent renders black. Ocre is the atlas's own
          ink, the same the eyebrow above it uses. */}
      <div data-testid="page-loading-band" className="afh-accent-ocre">
        <DidYouKnowLoader fact={pickDidYouKnowFact()} label={label} />
      </div>
    </PageLayout>
  );
}
