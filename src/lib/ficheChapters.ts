/**
 * What a fiche declares as its chapters, and how a reader addresses one.
 *
 * A fiche is one long document, and the reading rail above it has to know
 * which chapter the reader is in. The rail could have been fed a hand-written
 * list of chapters per entity type — but the chapters are conditional
 * (`Fragmentation coloniale` only exists across a border, `Voix & récits`
 * only after its client fetch answers), so that list would restate every
 * gate in the three views and drift the first time one of them changed.
 *
 * So the rendered document stays the single source of truth. Each chapter
 * already carried `data-fiche-section` for the parity contract; the rail
 * reads the same attribute. A chapter the corpus does not produce is simply
 * not in the DOM, and therefore not in the rail — no gate to keep in sync.
 */

/** The attribute a fiche chapter announces itself with. */
// @req REQ-091
export const FICHE_CHAPTER_ATTRIBUTE = "data-fiche-section";

/**
 * The anchor the fiche's dossier stands under.
 *
 * A published address, not an implementation detail: the globe's facts panel
 * links a country back to the dossier through it, and deep links from
 * elsewhere in the app point at it. It was derived from a panel kind while the
 * chapter engine existed; with the dossier the only thing a fiche composes, it
 * is simply the name of that section.
 */
// @req REQ-091
export const FICHE_RECORD_ANCHOR = "fiche-record";

export interface FicheChapter {
  /** The anchor a rail entry links to — the element's own `id`. */
  id: string;
  title: string;
  element: HTMLElement;
}

/**
 * The anchor a chapter title derives when the chapter does not name one.
 *
 * French titles are the input, so diacritics are folded rather than dropped:
 * `porté` has to reach `porte`, not `port`. The `chapitre-` prefix keeps
 * these out of the way of the anchors the app already publishes (`sources`,
 * `fiche`, `fiche-record`), which deep links point at from elsewhere.
 */
// @req REQ-091
export function chapterAnchorId(title: string): string {
  const slug = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug ? `chapitre-${slug}` : "chapitre";
}

/**
 * The chapters a rendered fiche declares, in reading order.
 *
 * A chapter with no anchor is dropped: the rail's only job is to take a
 * reader somewhere, and an entry that scrolls nowhere is worse than a
 * missing one. Anchors are deduplicated for the same reason — two entries
 * pointing at one target read as a bug to whoever clicks the second.
 */
// @req REQ-091
export function readFicheChapters(root: ParentNode): FicheChapter[] {
  const seen = new Set<string>();

  return Array.from(
    root.querySelectorAll<HTMLElement>(`[${FICHE_CHAPTER_ATTRIBUTE}]`)
  ).reduce<FicheChapter[]>((chapters, element) => {
    const title = (element.getAttribute(FICHE_CHAPTER_ATTRIBUTE) ?? "").trim();
    const id = element.id;

    if (!title || !id || seen.has(id)) return chapters;

    seen.add(id);
    chapters.push({ id, title, element });
    return chapters;
  }, []);
}
