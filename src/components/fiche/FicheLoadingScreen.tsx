import { PageLayout } from "@/components/layout/PageLayout";
import { ACCENT_CLASS_BY_ENTITY } from "@/components/fiche/FicheSequence";
import type { FicheEntityType } from "@/types/fiche";
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
  name: "Chargement de la fiche appellation",
};

export interface FicheLoadingScreenProps {
  entityType: FicheEntityType;
}

/**
 * The surface a fiche route shows while its data is being fetched (REQ-104).
 *
 * The shell is `PageLayout`, so React reconciles the two trees when the fiche
 * resolves and the header, the search modal and the footer are never
 * unmounted: the reader keeps their orientation across the navigation
 * (REQ-098). A loading file that rendered bare content would blank the
 * navigation bar for the length of the wait and bring it back — the page
 * would appear to reload.
 *
 * ── Why no band ───────────────────────────────────────────────────────────
 * This used to open on `FicheHeroBand`, the very night band the fiche opens
 * on, floored at `--afh-globe-stage-height`, under a plate naming the section.
 * The argument was continuity: raise the same band and the chrome will not
 * collapse and re-expand around the arriving fiche.
 *
 * Nothing in the wait survives into that fiche to be kept still. The plate
 * that says "Pays" is replaced by the plate that says "Afrique du Sud", and
 * the body is swapped whole. What the band did buy, measured on
 * `/fr/atlas/pays/ZAF`, is a stage the height of the globe stacked under a
 * plate: together they took the entire viewport, so the fact — the whole
 * content of the wait — sat below the fold and was never read, on precisely
 * the routes that wait longest. One wait, one shape: the fact, and the chrome
 * around it (brand charter §8.4).
 *
 * The accent comes from the fiche's own `ACCENT_CLASS_BY_ENTITY`, so the wait
 * is already tinted in the colour the arriving fiche will use — teal for a
 * country, ocre for a people, pervenche for a family. It is a scope rather
 * than a flourish: `--accent` is declared twice under two incompatible
 * meanings, and outside an `.afh-accent-*` wrapper `fill: var(--accent)`
 * resolves to nothing and the continent paints black.
 */
// @req REQ-098
// @req REQ-104
export function FicheLoadingScreen({ entityType }: FicheLoadingScreenProps) {
  return (
    <PageLayout language="fr" hideHeader hideTrail>
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
