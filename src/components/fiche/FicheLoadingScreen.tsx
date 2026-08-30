import { PageLayout } from "@/components/layout/PageLayout";
import { FicheHeroBand } from "@/components/fiche/FicheHeroBand";
import { ACCENT_CLASS_BY_ENTITY } from "@/components/fiche/FicheSequence";
import type { FicheEntityType } from "@/types/fiche";
import { AfricaTraceLoader } from "@/components/system/AfricaTraceLoader";
import { DidYouKnowLoader } from "@/components/system/DidYouKnowLoader";
import { pickDidYouKnowFact } from "@/lib/home/didYouKnowFacts";

/**
 * What a reader is told the wait is for. A screen reader gets this sentence
 * and nothing else, so it names the fiche rather than the act of loading.
 */
const WAIT_LABEL: Record<FicheEntityType, string> = {
  country: "Chargement de la fiche pays",
  people: "Chargement de la fiche peuple",
  "language-family": "Chargement de la fiche famille",
};

export interface FicheLoadingScreenProps {
  entityType: FicheEntityType;
  /** The section the header names — "Pays", "Peuples", "Familles". */
  sectionName: string;
}

/**
 * The surface a fiche route shows while its data is being fetched (REQ-104).
 *
 * Three things make this more than a spinner in a box:
 *
 * The shell is the fiche's own `PageLayout`, with the same props the fiche
 * passes. React reconciles the two trees when the page resolves, so the
 * header, the search modal and the footer are never unmounted and the reader
 * keeps their orientation across the navigation (REQ-098). A loading file
 * that rendered bare content would blank the navigation bar for the length of
 * the wait and bring it back — the page would appear to reload.
 *
 * That includes the hero band, which is why this raises one too. It names the
 * section rather than the fiche — the wait is precisely the state in which the
 * subject's own name is not yet known — and the band's floor means the plate
 * that says "Pays" and the plate that says "Bénin" occupy the same height, so
 * the arrival swaps the text without moving the globe below it.
 *
 * The band is `FicheHeroBand`, the very component the fiche opens on, so the
 * night ground, the full-bleed width and the ochre seam cannot drift from the
 * page they precede. Only the globe's height is restated, from the token
 * `AtlasGlobe` itself reads: it is what stops the parchment from jumping up
 * the screen when the real band lands.
 *
 * The accent comes from the fiche's own `ACCENT_CLASS_BY_ENTITY`, so the wait
 * is already tinted in the colour the arriving fiche will use — teal for a
 * country, ocre for a people, pervenche for a family.
 */
// @req REQ-098
// @req REQ-104
export function FicheLoadingScreen({
  entityType,
  sectionName,
}: FicheLoadingScreenProps) {
  return (
    <PageLayout language="fr" sectionName={sectionName} flushTop>
      <FicheHeroBand>
        <div
          data-testid="fiche-loading-band"
          className="afh-on-night"
          style={{ minHeight: "var(--afh-globe-stage-height)" }}
        >
          {/* The accent scope must sit *below* afh-on-night, never on the same
              element. `--accent` is declared twice under two different
              meanings: index.css gives it shadcn's bare HSL triplet, meant to
              be read as hsl(var(--accent)), and color.css gives it a hex on
              the .afh-accent-* wrappers. Sharing one element lets the triplet
              win, and `fill: var(--accent)` then resolves to an invalid colour
              — the continent renders black on the night ground. One element
              down, the accent wrapper is the nearest declaration and the hex
              wins. The fiche itself is built the same way, which is why it
              never hit this. */}
          <div
            className={ACCENT_CLASS_BY_ENTITY[entityType]}
            style={{ height: "100%" }}
          >
            {/* Decorative here: the live region below owns the announcement,
                and two status regions for one navigation make a screen
                reader arbitrate between them. */}
            <AfricaTraceLoader decorative label={WAIT_LABEL[entityType]} />
          </div>
        </div>
      </FicheHeroBand>

      {/* The fact waits on the parchment, never on the night band: the band
          is sized to the globe and holds the fiche's own shape, and a column
          of body copy dropped into it would be the one thing on the site
          asserting that a globe and a paragraph occupy the same slot. */}
      <div className={ACCENT_CLASS_BY_ENTITY[entityType]}>
        <DidYouKnowLoader
          fact={pickDidYouKnowFact()}
          label={WAIT_LABEL[entityType]}
        />
      </div>
    </PageLayout>
  );
}

export default FicheLoadingScreen;
