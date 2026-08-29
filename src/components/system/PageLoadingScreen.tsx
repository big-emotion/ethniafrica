import { PageLayout } from "@/components/layout/PageLayout";
import { AfricaTraceLoader } from "@/components/system/AfricaTraceLoader";

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
 * else's. What the two share is the part that matters — `AfricaTraceLoader`,
 * the committed coastline inked south to north, so every wait on the site
 * belongs to one cartographic grammar rather than to a component kit's
 * spinner.
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
      {/* A floor rather than a fixed height: the arriving pages differ too
          much in length to guess one, and this is enough for the figure to
          read as a figure without the footer riding up the screen. */}
      <div
        data-testid="page-loading-band"
        style={{ minHeight: "min(52vh, 420px)" }}
      >
        <AfricaTraceLoader label={label} />
      </div>
    </PageLayout>
  );
}

export default PageLoadingScreen;
