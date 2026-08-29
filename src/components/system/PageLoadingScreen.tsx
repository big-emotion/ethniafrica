import { PageLayout } from "@/components/layout/PageLayout";
import { DidYouKnowLoader } from "@/components/system/DidYouKnowLoader";
import { pickDidYouKnowFact } from "@/lib/home/didYouKnowFacts";

export interface PageLoadingScreenProps {
  /**
   * What is being waited for, in the reader's words — "Chargement du quiz",
   * not "Chargement". A screen reader announces this and nothing else, so a
   * bare "loading" leaves its user with less than the sighted reader gets
   * from the surrounding page.
   */
  label: string;
  /** The section the header names — "Explorer", "Comprendre", "Jouer". */
  sectionName?: string;
}

/**
 * The wait state of an ordinary page (REQ-104).
 *
 * `FicheLoadingScreen` answers the same need for the three fiche routes, and
 * it is not reusable here: it opens on `FicheHeroBand`, a full-bleed night
 * band sized to the atlas globe, which is the fiche's own shape and nobody
 * else's. What the two share is the part that matters — `DidYouKnowLoader`,
 * one onomastic fact unveiled at reading pace, so every wait on the site is
 * spent on the same thing rather than on a component kit's spinner.
 *
 * The fact is drawn here rather than passed in, because a loading file has no
 * request context of its own to draw from and every caller would otherwise
 * repeat the same three lines.
 *
 * The shell is `PageLayout`, with the same props the arriving page passes.
 * React reconciles the two trees when the page resolves, so the header, the
 * search modal and the footer are never unmounted and the reader keeps their
 * orientation across the navigation (REQ-098). A loading file that rendered
 * bare content would blank the navigation bar for the length of the wait and
 * bring it back — the page would appear to reload.
 *
 * Nothing is painted for the first 300 ms; see `LOADER_REVEAL_DELAY_MS`. A
 * page that resolves quickly therefore shows no indicator at all, which is
 * the point: an indicator inside that window is a flash, not information.
 */
// @req REQ-098
// @req REQ-104
export function PageLoadingScreen({
  label,
  sectionName,
}: PageLoadingScreenProps) {
  return (
    <PageLayout language="fr" sectionName={sectionName}>
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

export default PageLoadingScreen;
