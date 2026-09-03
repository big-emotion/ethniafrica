"use client";

/**
 * The fiche's reading rail — a bar that stays with the reader down the
 * document, naming the chapter they are in and opening the fiche's summary.
 *
 * A fiche past the globe is one uninterrupted parchment, sometimes a dozen
 * chapters long. Nothing in it told a reader how far in they were, and
 * nothing took them back to a chapter they had scrolled past; the only way
 * back was the scrollbar and a guess. The rail answers both questions with
 * the same instrument, which is why the position readout and the summary
 * share one control rather than sitting side by side.
 *
 * It reads the chapters off the rendered document (see lib/ficheChapters) and
 * re-reads them when the document changes, because a people fiche's oral
 * narratives only appear once their fetch answers — a rail built once at
 * mount would be missing a chapter that is plainly on the page.
 *
 * Nothing here names an accent: the bar reads `var(--accent)`, and the scope
 * class FicheSequence puts on its root decides which one (charter §2).
 */

import { ChevronDown } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { FlagTarget } from "@/components/flags/FlagTarget";
import {
  FICHE_CHAPTER_ATTRIBUTE,
  readFicheChapters,
  type FicheChapter,
} from "@/lib/ficheChapters";

const SUMMARY_ID = "fiche-chapter-summary";

/**
 * Where the reading band sits: a chapter counts as the one being read once
 * its top clears the rail, and stops counting once it has left all but the
 * top third of the viewport. Without the lower bound every chapter below the
 * fold would count as read and the rail would always name the last one.
 */
const READING_BAND = "-15% 0px -70% 0px";

/** `3` → `03`, so the readout does not reflow as the reader passes chapter 9. */
function padded(position: number): string {
  return String(position).padStart(2, "0");
}

export interface FicheChapterBarProps {
  /**
   * What the fiche is about, so the rail's report control has a subject.
   * Omitted, the rail is still a rail — it simply carries no report control,
   * because a report with no subject is a message the moderator cannot act on.
   */
  entityId?: string;
  entityName?: string;
}

// @req REQ-091
export function FicheChapterBar({
  entityId,
  entityName,
}: FicheChapterBarProps = {}) {
  const railRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const [chapters, setChapters] = useState<FicheChapter[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);

  // The chapters of *this* fiche. Scoping to the sequence rather than the
  // document keeps a chapter rendered elsewhere on the page — a preview in a
  // panel, a modal — out of a rail that could not scroll to it anyway.
  //
  // The scope comes from the sequence's marker, not from the rail's own
  // position: the rail renders nothing until it has found two chapters, so at
  // the moment this effect runs there is no rail in the tree to climb from.
  useEffect(() => {
    const fiche =
      document.querySelector("[data-fiche-sequence]") ?? document.body;

    const reread = () => setChapters(readFicheChapters(fiche));
    reread();

    const watcher = new MutationObserver(reread);
    watcher.observe(fiche, {
      childList: true,
      subtree: true,
      attributeFilter: [FICHE_CHAPTER_ATTRIBUTE, "id"],
    });
    return () => watcher.disconnect();
  }, []);

  // Which chapter is being read. The observer reports only what changed, so
  // the set of chapters on screen is kept across callbacks and the rail names
  // the topmost of them — the one the reader has most recently entered.
  useEffect(() => {
    // No observer to build, and none needed: until one reports, `position`
    // reads the fiche as opened at its first chapter.
    if (chapters.length === 0 || typeof IntersectionObserver === "undefined")
      return;

    const onScreen = new Set<string>();
    const spy = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).id;
          if (entry.isIntersecting) onScreen.add(id);
          else onScreen.delete(id);
        }
        const topmost = chapters.find((chapter) => onScreen.has(chapter.id));
        // Between two chapters nothing is on screen. Holding the last one is
        // truer than blanking: the reader is still in the fiche.
        if (topmost) setCurrentId(topmost.id);
      },
      { rootMargin: READING_BAND }
    );

    for (const chapter of chapters) spy.observe(chapter.element);
    return () => spy.disconnect();
  }, [chapters]);

  const close = useCallback((returnFocus: boolean) => {
    setSummaryOpen(false);
    if (returnFocus) toggleRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!summaryOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close(true);
    };
    const onPointerDown = (event: MouseEvent) => {
      if (!railRef.current?.contains(event.target as Node)) close(false);
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [close, summaryOpen]);

  const position = useMemo(() => {
    const index = chapters.findIndex((chapter) => chapter.id === currentId);
    return index === -1 ? 0 : index;
  }, [chapters, currentId]);

  /**
   * A plain anchor would jump but leave focus on the rail, so a keyboard
   * reader would arrive at a chapter they cannot read from. Taking the click
   * lets the rail move focus to the chapter itself and keep the fragment in
   * the URL, which is what makes a chapter shareable.
   */
  const openChapter = (
    event: React.MouseEvent<HTMLAnchorElement>,
    chapter: FicheChapter
  ) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey) return;
    event.preventDefault();
    close(false);

    const reduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    )?.matches;
    chapter.element.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
    chapter.element.tabIndex = -1;
    chapter.element.focus({ preventScroll: true });
    window.history.replaceState(null, "", `#${chapter.id}`);
  };

  // One chapter is not a sequence, and a rail over it would be chrome with
  // nothing to navigate. This also covers the frames before the first read.
  if (chapters.length < 2) return null;

  const current = chapters[position];

  return (
    <nav
      ref={railRef}
      className="afh-chapter-bar"
      aria-label="Chapitres de la fiche"
      data-testid="fiche-chapter-bar"
      data-open={summaryOpen ? "" : undefined}
      style={
        {
          "--afh-chapter-read": `${((position + 1) / chapters.length) * 100}%`,
        } as React.CSSProperties
      }
    >
      {/* The head is its own box so the read rule stays pinned under the bar
          rather than under the whole rail once the summary is open. */}
      <div className="afh-chapter-bar-head">
        <button
          ref={toggleRef}
          type="button"
          className="afh-chapter-bar-toggle"
          data-testid="fiche-chapter-bar-toggle"
          aria-expanded={summaryOpen}
          aria-controls={SUMMARY_ID}
          // The word "Sommaire" is dropped at narrow widths for room, so the
          // control states in full what it is rather than depending on a label
          // the layout is free to hide.
          aria-label={`Sommaire de la fiche — chapitre ${position + 1} sur ${chapters.length} : ${current.title}`}
          onClick={() => setSummaryOpen((open) => !open)}
        >
          <span
            className="afh-chapter-bar-count"
            data-testid="fiche-chapter-bar-count"
          >
            {padded(position + 1)} / {padded(chapters.length)}
          </span>
          <span
            className="afh-chapter-bar-current"
            data-testid="fiche-chapter-bar-current"
          >
            {current.title}
          </span>
          <span className="afh-chapter-bar-cue" aria-hidden="true">
            <span className="afh-chapter-bar-cue-label">Sommaire</span>
            <ChevronDown className="afh-chapter-bar-caret" />
          </span>
        </button>

        {/* The report control, moderation charter §3: reachable at every
            moment of the reading, and knowing what is being read. It stands
            here rather than floating over the page because the rail is the one
            thing that already tracks the chapter in view — a floating button
            would be just as reachable and would have to ask the reader which
            part they meant, which is §1 again.

            A sibling of the toggle, never inside it: the toggle is a button,
            and a button inside a button is invalid and unreachable by keyboard.

            The per-section controls stay. They serve the reader aiming at
            something narrower than a chapter. */}
        {entityId ? (
          <div className="afh-chapter-bar-report">
            <FlagTarget
              target={{
                type: "fiche_section",
                id: entityId,
                name: entityName,
                // The chapter's anchor, which is a published address a
                // moderator can open, rather than a JSON path they would have
                // to translate back into a place on the page.
                fieldPath: current.id,
                fieldLabel: current.title,
              }}
              triggerLabel="Signaler"
              // h-11, not h-9: 36px is under the 44px floor the reading
              // surface owes a thumb, and the rail is 48px tall, so the
              // taller control still sits inside it.
              className="w-auto h-11 px-3 text-afh-caption"
            />
          </div>
        ) : null}

        {/* The read rule: how much of the fiche is behind the reader. */}
        <span className="afh-chapter-bar-read" aria-hidden="true" />
      </div>

      <ul
        id={SUMMARY_ID}
        className="afh-chapter-bar-summary"
        data-testid="fiche-chapter-bar-summary"
        hidden={!summaryOpen}
      >
        {chapters.map((chapter) => (
          <li key={chapter.id}>
            <a
              href={`#${chapter.id}`}
              aria-current={chapter.id === current.id ? "true" : undefined}
              onClick={(event) => openChapter(event, chapter)}
            >
              {chapter.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
