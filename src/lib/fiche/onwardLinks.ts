import { violatesReaderRegister } from "@/lib/editorial/readerRegister";
import {
  getCountryRoute,
  getFamilyRoute,
  getLanguageRoute,
  getPatronymeRoute,
  getPeopleRoute,
} from "@/lib/routing";
import type { FicheEntityType } from "@/types/fiche";
import type { Language } from "@/types/shared";

/**
 * Where a fiche lets its reader go next.
 *
 * Measured on production 2026-09-07: a fiche holds a reader for 251 to 276
 * seconds — ten times what the listings that point at them manage — and ten of
 * them still show a 100 % exit rate. The reading is not the problem; the foot
 * of the document is, because nothing there points anywhere.
 *
 * The links are read off relations the corpus already declares. Nothing here
 * scores, ranks or recommends: a fiche that names a family, three countries
 * and a patronyme offers exactly those, and one that names nothing offers
 * nothing at all.
 */

/** One reachable fiche, before it is given an address. */
export interface OnwardTarget {
  /** The entity's own identifier — used to build its address, never shown. */
  id: string;
  /** What the reader sees, in the reader's own register. */
  name: string;
}

/** Everything of one kind a fiche can send its reader to. */
export interface OnwardGroup {
  kind: FicheEntityType;
  targets: readonly OnwardTarget[];
  /**
   * How many of this kind the block may carry. A people fiche declares two
   * for its siblings and one for its family: without a per-kind quota a people
   * that straddles seven borders would spend the whole block on countries.
   */
  max: number;
}

export interface OnwardLink {
  kind: FicheEntityType;
  name: string;
  href: string;
}

/**
 * Five is what a reader will weigh at the end of a document, not a layout
 * constraint. Past it the block stops being an invitation and becomes a
 * second listing — and the listings are what the fiches out-read ten to one.
 */
// @req REQ-091
export const ONWARD_MAX_LINKS = 5;

const ROUTE_BY_KIND: Record<
  FicheEntityType,
  (language: Language, id: string) => string
> = {
  people: getPeopleRoute,
  country: getCountryRoute,
  "language-family": getFamilyRoute,
  language: getLanguageRoute,
  name: getPatronymeRoute,
};

/**
 * A target the reader can be shown.
 *
 * `getCountryPatronymes` falls back to the raw identifier when a name does not
 * resolve, so `PAT_KANTE` reaches this function as a display name. A reader is
 * owed a name or nothing — never the corpus's own filing.
 */
function isShowable(target: OnwardTarget): boolean {
  const name = target.name.trim();
  return name.length > 0 && !violatesReaderRegister(name);
}

interface OnwardQueue {
  kind: FicheEntityType;
  max: number;
  remaining: OnwardTarget[];
}

/**
 * The next destination this queue has that no other link already reached.
 *
 * A relation declared twice — the same country under two spellings, a people
 * both attested and inferred — is one destination, and a repeated row reads as
 * a defect rather than as emphasis. The duplicate is consumed here so it costs
 * no slot in the block.
 */
function takeNextUnclaimed(
  queue: OnwardQueue,
  language: Language,
  claimed: ReadonlySet<string>
): OnwardLink | null {
  let target = queue.remaining.shift();

  while (target) {
    const href = ROUTE_BY_KIND[queue.kind](language, target.id);
    if (!claimed.has(href)) {
      return { kind: queue.kind, name: target.name.trim(), href };
    }
    target = queue.remaining.shift();
  }

  return null;
}

/**
 * The links a fiche offers, breadth first.
 *
 * One of every declared kind before a second of any: a reader at the foot of
 * the Fula fiche is better served by a family, a country and a patronyme than
 * by three countries. Once every kind has been offered once, the remaining
 * slots are filled in the same declared order.
 */
// @req REQ-091
export function buildOnwardLinks(
  groups: readonly OnwardGroup[],
  language: Language,
  self?: { kind: FicheEntityType; id: string }
): OnwardLink[] {
  const queues: OnwardQueue[] = groups.map((group) => ({
    kind: group.kind,
    max: group.max,
    remaining: group.targets.filter(
      (target) =>
        isShowable(target) &&
        !(self && self.kind === group.kind && self.id === target.id)
    ),
  }));

  const links: OnwardLink[] = [];
  const claimed = new Set<string>();
  const deepest = Math.max(0, ...queues.map((queue) => queue.max));

  for (
    let rank = 0;
    rank < deepest && links.length < ONWARD_MAX_LINKS;
    rank++
  ) {
    for (const queue of queues) {
      if (links.length >= ONWARD_MAX_LINKS) break;
      if (rank >= queue.max) continue;

      const link = takeNextUnclaimed(queue, language, claimed);
      if (!link) continue;

      claimed.add(link.href);
      links.push(link);
    }
  }

  return links;
}
