"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SEARCH_EMPTY_LINK_LABEL } from "@/components/ui/EmptyState";
import { SEARCH_ENTITY_ACCENT } from "@/components/search/searchEntityAccent";
import { NoResultsLeads } from "@/components/search/NoResultsLeads";
import { HomeHeroSeeds } from "./HomeHeroSeeds";
import type { SeedWordsByKind } from "@/lib/home/seedWords";
import { search as searchCorpus, searchWithLeads } from "@/lib/afrikLoader";
import {
  SEARCH_LABEL,
  SEARCH_PLACEHOLDER,
  SEARCH_RESULT_GROUPS,
} from "@/lib/search/searchVocabulary";
import {
  getCountryRoute,
  getFamilyRoute,
  getLanguageRoute,
  getLocalizedRoute,
  getPatronymeRoute,
  getPeopleRoute,
  getPersonRoute,
} from "@/lib/routing";
import { useAutocomplete } from "@/hooks/use-autocomplete";
import { cn } from "@/lib/utils";
import type {
  SearchEntityType,
  SearchLead,
  SearchResult,
} from "@/types/afrik-frontend";
import type { Language } from "@/types/shared";

/**
 * The home's search field (REQ-002).
 *
 * Readers reach the corpus by typing, not by browsing: the only affordance on
 * the opening band used to be the masthead's magnifier, and that is where they
 * went. This puts the field where the behaviour already was.
 *
 * **The query is untyped; the answer is typed.** Neither a scope selector nor
 * a placeholder cycling between "quel peuple ?" and "quel pays ?" is used
 * here, because both ask the reader to classify a query they often cannot:
 * Kongo is a people *and* a country, Yoruba a people *and* a language. So the
 * field takes plain text and the panel groups what comes back — which is also
 * the shape `/api/v2/search` already answers in (one key per kind, never one
 * flat list). The taxonomy is taught in the result, where it costs the reader
 * nothing, instead of demanded as a precondition.
 *
 * The seed chips carry the same teaching in the corpus' own words — literally,
 * since the words are drawn from the fiches on every request (seedWords.ts):
 * three chips on a phone, and a fourth people example uses the extra desktop
 * room. They cover three of the five kinds the panel now groups rather than
 * all of them; a chip per kind would wrap the row, and the classes the chips
 * leave out are named by the headline above. Each reels through corpus examples, drawn
 * again on every visit. That motion is deliberately on the
 * chips and not on the placeholder — a placeholder is a control's name, it
 * would be renamed under a screen reader six times a minute, and it vanishes
 * at the exact moment the reader focuses the field. A chip is neither a name
 * nor transient, and it stops as soon as the reader arrives.
 */

/**
 * The label carries no second line of help under it. What the reader gets — a
 * documented record, with its sources — is what the hero's own answer states
 * forty pixels above, and saying it twice is the failure that cost this band
 * its previous standfirst (see the docblock in HomeHero).
 */

const MIN_QUERY_LENGTH = 2;
// @req REQ-002
export const DEBOUNCE_MS = 300;

/**
 * The wait only becomes worth reporting once it is long enough to be felt.
 * Below the delay the request is never announced at all — an indicator that
 * appears and vanishes inside a tenth of a second reads worse than the silence
 * it replaced. Once shown it stays for the minimum, so a request that settles
 * just after the delay does not produce the same flicker one frame later.
 */
// @req REQ-002
export const PENDING_DELAY_MS = 150;
const PENDING_MIN_MS = 400;
/** Enough to prove the kind exists without turning the band into a listing. */
const MAX_PER_GROUP = 3;

// Hoisted, not written inline as a default parameter: a fresh closure on every
// render is a fresh dependency for the effect below, which resets state on its
// way through and so re-renders — one unstable identity is an infinite loop.
const fetchFromCorpus = (query: string) => searchCorpus(query);

// REQ-125: a second, independent request rather than a `fetchResults` return
// shape change — every existing caller and test injects `fetchResults` as
// `(query) => Promise<SearchResult[]>`, and that contract stays untouched.
const fetchLeadsFromCorpus = (query: string) =>
  searchWithLeads(query).then((r) => r.leads);

/**
 * A table rather than a chain of ifs, and typed `Record<SearchEntityType, …>`
 * so a seventh kind cannot be added to the union without a route for it.
 *
 * The chain this replaces ended in `return getPeopleRoute(...)`, which was
 * correct while the panel showed three kinds and silently wrong the moment it
 * showed five: a language would have been addressed as `/fr/atlas/peuples/bam`
 * and answered 404. `strictNullChecks` is off in this project, so no compiler
 * error was ever going to catch that — an exhaustive record is what does.
 */
const FICHE_ROUTE: Record<
  SearchEntityType,
  (language: Language, id: string) => string
> = {
  people: getPeopleRoute,
  country: getCountryRoute,
  languageFamily: getFamilyRoute,
  language: getLanguageRoute,
  patronyme: getPatronymeRoute,
  person: getPersonRoute,
};

function ficheHref(result: SearchResult, language: Language): string {
  return FICHE_ROUTE[result.type](language, result.id);
}

export interface HomeHeroSearchProps {
  language?: Language;
  /** Injected by tests; defaults to the corpus search every other surface uses. */
  fetchResults?: (query: string) => Promise<SearchResult[]>;
  /** Injected by tests; defaults to the corpus's near-miss leads (REQ-125). */
  fetchLeads?: (query: string) => Promise<SearchLead[]>;
  /** Drawn from the corpus by the server on every request; see seedWords.ts. */
  seedWords?: SeedWordsByKind;
}

// @req REQ-002
export function HomeHeroSearch({
  language = "fr",
  fetchResults = fetchFromCorpus,
  fetchLeads = fetchLeadsFromCorpus,
  seedWords,
}: HomeHeroSearchProps = {}) {
  const router = useRouter();
  const [leads, setLeads] = useState<SearchLead[]>([]);
  const [showPending, setShowPending] = useState(false);
  // The seed reels stop at the first sign of the reader. Hovering or tabbing
  // into the row is one such sign and the row hears it itself; reaching for
  // the field is the other, and only this component is in a position to know.
  const [fieldTouched, setFieldTouched] = useState(false);
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingShownAt = useRef(0);

  /**
   * Each class is capped on its own, so five kinds each keep a foothold in the
   * panel instead of one prolific kind filling it. Done here rather than after
   * the fact because the hook numbers the options it is handed, and a reader
   * pressing ArrowDown must land on the option they can see.
   */
  const capPerGroup = useCallback(
    (found: SearchResult[]) =>
      SEARCH_RESULT_GROUPS.flatMap(({ type }) =>
        found.filter((result) => result.type === type).slice(0, MAX_PER_GROUP)
      ),
    []
  );

  /**
   * REQ-125: near-misses are worth asking for only once the corpus itself came
   * back empty. Fired without awaiting — they are a secondary enhancement and
   * must never hold the busy indicator up for a second round trip. The hook
   * calls this for the winning query only, so a slow lead cannot land under a
   * newer answer.
   */
  const handleResolved = (found: SearchResult[], forQuery: string) => {
    if (found.length > 0) {
      setLeads([]);
      return;
    }
    fetchLeads(forQuery).then(setLeads);
  };

  const suggest = useAutocomplete<SearchResult>({
    fetchSuggestions: fetchResults,
    onSelect: (result) => router.push(ficheHref(result, language)),
    onResolved: handleResolved,
    minLength: MIN_QUERY_LENGTH,
    debounceMs: DEBOUNCE_MS,
    arrange: capPerGroup,
  });

  const { query, activeIndex, pending } = suggest;
  const trimmed = query.trim();

  useEffect(() => {
    if (pending) {
      const timer = setTimeout(() => {
        pendingShownAt.current = Date.now();
        setShowPending(true);
      }, PENDING_DELAY_MS);
      return () => clearTimeout(timer);
    }
    if (!showPending) return;

    const shownFor = Date.now() - pendingShownAt.current;
    const timer = setTimeout(
      () => setShowPending(false),
      Math.max(0, PENDING_MIN_MS - shownFor)
    );
    return () => clearTimeout(timer);
  }, [pending, showPending]);

  const flat = suggest.options;

  /**
   * The panel's headings, rebuilt from the options the hook numbered — same
   * partition, same order, so a group's option carries the index the keyboard
   * and `aria-activedescendant` both refer to.
   */
  const groups = useMemo(() => {
    let cursor = 0;
    return SEARCH_RESULT_GROUPS.map(({ type, heading }) => {
      const options = flat
        .filter((result) => result.type === type)
        .map((result) => ({ result, index: cursor++ }));
      return { type, heading, options };
    }).filter((group) => group.options.length > 0);
  }, [flat]);

  const open = suggest.isAnswered;
  const showListbox = suggest.isOpen;

  const clearQuery = () => {
    suggest.clear();
    inputRef.current?.focus();
  };

  /**
   * Escape and an emptied field used to be the only two ways out of this
   * panel, so it outlived every other gesture — including the one that takes
   * the reader to the results page, where it then covered the answer they had
   * just asked for.
   *
   * Dismissing is deliberately not the same as clearing: the query stays in
   * the field, because a reader who submits it is about to see it again at the
   * top of the results page.
   */
  const dismissPanel = () => suggest.dismiss();

  // Anything inside the anchor — an option being tabbed to, the clear button —
  // is still this control. Only focus landing outside it closes the panel.
  const handleFocusLeave = (event: React.FocusEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }
    dismissPanel();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    // The panel first, the text second. Escape is the platform's clear gesture
    // in a search field and its dismiss gesture for a popup; taking the
    // reader's words while a panel is covering them would be the wrong one of
    // the two. Only the second step is this field's own — the shared hook
    // dismisses, and never empties.
    if (event.key === "Escape" && !open && query) {
      clearQuery();
      return;
    }
    suggest.handleKeyDown(event);
  };

  const searchRoute = getLocalizedRoute(language, "search");
  const runSeed = (seed: string) =>
    router.push(`${searchRoute}?${new URLSearchParams({ q: seed })}`);

  return (
    <div className="home-hero-search afh-accent-ocre">
      {/* The panel's containing block, and it stops at the form on purpose:
          hung off .home-hero-search instead, an overlay would open below the
          seed chips rather than under the field it answers for. */}
      <div className="home-hero-search-anchor" onBlur={handleFocusLeave}>
        {/* A plain GET form, not a router push: submitting then works before
          React has hydrated, and the panel below is the enhancement rather
          than the feature. The page it lands on shows everything the panel
          caps at three per kind, with the filters — which is how a reader
          leaves the hero without dead-ending. */}
        <form
          role="search"
          method="get"
          action={searchRoute}
          className="home-hero-search-form"
          onSubmit={dismissPanel}
        >
          <label htmlFor={inputId} className="home-hero-search-label">
            {SEARCH_LABEL}
          </label>

          <div className="home-hero-search-field">
            {/* The indicator takes the magnifier's slot rather than a slot of
                its own: same width, so the text never shifts as it appears. */}
            {showPending ? (
              <span
                data-testid="home-hero-search-pending"
                aria-hidden="true"
                className="home-hero-search-spinner"
              />
            ) : (
              <Search
                aria-hidden="true"
                className="size-5 shrink-0 text-afh-text-soft"
              />
            )}
            <input
              ref={inputRef}
              id={inputId}
              name="q"
              aria-busy={pending}
              {...suggest.comboboxProps}
              placeholder={SEARCH_PLACEHOLDER}
              type="search"
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              value={query}
              onChange={(event) => suggest.setQuery(event.target.value)}
              onFocus={() => setFieldTouched(true)}
              onKeyDown={handleKeyDown}
            />

            {/* type="button" is load-bearing: this sits inside a GET form,
                where a button with no type is a submit button — the cross
                would navigate to the search page instead of emptying the
                field. */}
            {query && (
              <button
                type="button"
                aria-label="Effacer la recherche"
                className="home-hero-search-clear"
                onClick={clearQuery}
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            )}
          </div>

          <Button
            type="submit"
            variant="accent"
            className="home-hero-search-submit"
          >
            Rechercher
          </Button>
        </form>

        {showListbox && (
          <div
            id={suggest.listboxId}
            role="listbox"
            aria-label="Suggestions"
            className="home-hero-search-panel"
          >
            {groups.map((group) => (
              <div
                key={group.type}
                role="group"
                aria-label={group.heading}
                className={
                  SEARCH_ENTITY_ACCENT[group.type].accentScopeClassName
                }
              >
                <p aria-hidden="true" className="home-hero-search-group">
                  {group.heading}
                </p>
                {group.options.map(({ result, index }) => (
                  <Link
                    key={result.id}
                    {...suggest.getOptionProps(index)}
                    href={ficheHref(result, language)}
                    className={cn(
                      "home-hero-search-option",
                      index === activeIndex && "is-active"
                    )}
                    onMouseEnter={() => suggest.highlight(index)}
                    onClick={dismissPanel}
                  >
                    {result.name}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        )}

        {open && flat.length === 0 && (
          <div className="home-hero-search-panel home-hero-search-empty">
            <p data-testid="state-copy">
              Aucune fiche pour «&nbsp;{trimmed}&nbsp;».
            </p>
            <NoResultsLeads leads={leads} language={language} />
            <Link
              href={getLocalizedRoute(language, "families")}
              onClick={dismissPanel}
            >
              {SEARCH_EMPTY_LINK_LABEL}
            </Link>
          </div>
        )}
      </div>

      <HomeHeroSeeds
        onPick={runSeed}
        engaged={fieldTouched || query !== ""}
        words={seedWords}
      />

      {/* The spinner is the sighted half of the same message; this is the
          other half, and it reports the same two moments — the wait starting,
          and what came back. */}
      <div role="status" aria-live="polite" className="sr-only">
        {showPending
          ? "Recherche en cours…"
          : open
            ? flat.length > 0
              ? `${flat.length} suggestion${flat.length > 1 ? "s" : ""}`
              : "Aucune suggestion"
            : ""}
      </div>

      <style>{`
        /* The search remains a distinct action while sitting close enough to
           the answer to read as its way into the corpus. 36px on the phone,
           not the desktop 24 that used to apply everywhere: at 430px the
           title, the answer and the search sat close enough to read as one
           dense paragraph rather than a question followed by its way in. */
        .home-hero-search {
          margin-top: 36px;
          text-align: left;
        }

        /* A label, so full ink and reading weight: it is the only place the
           three searchable kinds are named where the reader keeps them while
           typing. The placeholder cannot do this — it empties at focus. */
        .home-hero-search-label {
          /* Its own line above the field, which is the next flex item. */
          flex: 0 0 100%;
          margin-bottom: 8px;
          font-size: var(--afh-text-small);
          font-weight: 600;
          color: var(--afh-text);
          /* Centred while the copy above it is centred. The block sets
             text-align: left for the input and the panel, so the label has to
             opt back in rather than inherit — one alignment per block. */
          text-align: center;
        }

        .home-hero-search-form {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        /* Radius 14px: the actions charter files an input under "an action or
           a content thing". A pill would read as a chip — one value among
           several — which is the opposite of what a free-text field offers. */
        .home-hero-search-field {
          display: flex;
          align-items: center;
          gap: 8px;
          /* Full width on a phone, so the button wraps under it rather than
             taking half the row: side by side at 430px the field is ~200px
             and clips its own placeholder, which is the one thing on this
             band that states what the corpus holds. */
          flex: 1 1 100%;
          min-width: 0;
          padding: 0 14px;
          min-height: 52px;
          background: var(--afh-surface);
          border: 1px solid var(--afh-border);
          border-radius: var(--afh-radius-lg);
        }
        .home-hero-search-field:focus-within {
          border-color: var(--accent-ink);
          box-shadow: 0 0 0 3px var(--accent-tint);
        }

        /* 16px, and fixed: below it Safari on iOS zooms the page on focus and
           the reader lands on a layout they then have to pinch back. */
        .home-hero-search-field input {
          flex: 1;
          min-width: 0;
          border: 0;
          outline: none;
          background: transparent;
          font-size: var(--afh-text-small);
          line-height: 1.4;
          color: var(--afh-text);
        }
        .home-hero-search-field input::placeholder {
          color: var(--afh-text-soft);
        }
        /* WebKit draws its own clear button, which lands on top of ours. */
        .home-hero-search-field input::-webkit-search-cancel-button {
          -webkit-appearance: none;
        }

        .home-hero-search-clear {
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 auto;
          width: 44px;
          height: 44px;
          margin-right: -10px;
          border: 0;
          border-radius: var(--afh-radius-full);
          background: transparent;
          color: var(--afh-text-soft);
          cursor: pointer;
        }
        .home-hero-search-clear:hover {
          background: var(--afh-bg-warm);
          color: var(--afh-text);
        }

        /* A ring, not a dot, and never a dimming of the results behind it:
           lowering the opacity of text is how this site has broken its own
           contrast gate before. */
        .home-hero-search-spinner {
          flex: 0 0 auto;
          width: 20px;
          height: 20px;
          border-radius: var(--afh-radius-full);
          border: 2px solid var(--accent-tint);
          border-top-color: var(--accent-ink);
          animation: home-hero-search-spin 700ms linear infinite;
        }

        @keyframes home-hero-search-spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* Not driven by the motion tokens: they collapse every duration to
           0.01ms under this query, which would spin the ring at roughly a
           hundred turns a second instead of stopping it. The ring holds
           still and the status region carries the message. */
        @media (prefers-reduced-motion: reduce) {
          .home-hero-search-spinner {
            animation: none;
          }
        }

        .home-hero-search-submit {
          min-height: 52px;
          flex: 1 1 8rem;
        }

        /* Centred while the copy above it is centred, ragged-right once the
           copy goes ragged-right at the two-column breakpoint. Alignment is a
           property of the block (brand charter §8.1), and this row sits in the
           same header as the question and its answer — a left-aligned row of
           chips under a centred headline is the third alignment in one block. */
        .home-hero-search-seeds {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 8px;
          margin: 12px 0 0;
          padding: 0;
          list-style: none;
        }
        /* Form D, and the page accent rather than each kind's own: a reader
           has not yet been taught the colour code on the first screen, and a
           hue that varies without a label to teach it reads as decoration. */
        .home-hero-search-seeds button {
          min-height: 44px;
          padding: 0 14px;
          border: 1px solid var(--accent-tint);
          border-radius: var(--afh-radius-full);
          background: transparent;
          font-size: var(--afh-text-small);
          color: var(--accent-ink);
          cursor: pointer;
        }
        .home-hero-search-seeds button:hover {
          background: var(--accent-tint);
        }

        /* The containing block for both panels, and it deliberately wraps only
           the form: anchored to .home-hero-search the panel would open below
           the seed chips instead of under the field. */
        .home-hero-search-anchor {
          position: relative;
        }

        /* Over the band, not in it. This used to sit in the flow and push the
           seed chips, the visual and the whole page down as the reader typed —
           the band's overflow:hidden was the reason, and that clip is now
           overflow-x:clip in HomeHero, which bounds the 100vw bleed without
           trapping anything that opens downward.

           Capped and scrollable rather than unbounded: on a phone the panel
           opens over the fold and a long list would otherwise run past the
           bottom of the screen with no way back to the field. */
        .home-hero-search-panel {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          right: 0;
          z-index: 20;
          max-height: min(60vh, 420px);
          overflow-y: auto;
          padding: 8px;
          background: var(--afh-surface);
          border: 1px solid var(--afh-border);
          border-radius: var(--afh-radius-lg);
          box-shadow: var(--afh-elev-warm);
        }

        /* Three classes deep on purpose. src/styles/mobile-text.css centres
           every paragraph inside .afh-phone-centred below 768px at
           specificity 0,2,0, and this panel is a descendant of the hero's
           centred header.
           A two-class override ties and loses to the later sheet, which left
           the group headings centred over ragged-right options — three
           alignments inside one card (brand charter §8.1). */
        .home-hero-search .home-hero-search-panel .home-hero-search-group,
        .home-hero-search .home-hero-search-panel p {
          text-align: left;
        }

        .home-hero-search-group {
          margin: 8px 0 4px;
          padding: 0 8px;
          font-size: var(--afh-text-eyebrow);
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--accent-ink);
        }

        .home-hero-search-option {
          display: flex;
          align-items: center;
          min-height: 44px;
          padding: 0 8px;
          border-radius: var(--afh-radius-lg);
          font-size: var(--afh-text-small);
          color: var(--afh-text);
          text-decoration: none;
        }
        .home-hero-search-option.is-active,
        .home-hero-search-option:hover {
          background: var(--afh-bg-warm);
        }

        .home-hero-search-empty {
          font-size: var(--afh-text-small);
          color: var(--afh-text-soft);
        }
        .home-hero-search-empty p {
          margin: 0 0 8px;
        }
        .home-hero-search-empty a {
          color: var(--accent-ink);
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        @media (min-width: 768px) {
          .home-hero-search {
            margin-top: 48px;
          }
          .home-hero-search-label {
            text-align: left;
          }
          .home-hero-search-seeds {
            justify-content: flex-start;
          }
          /* The field takes every pixel the button does not need. They used
             to grow at the same rate, which gave a 235px button the same
             weight as the field it serves — on a band whose whole purpose is
             the query, not the verb. */
          .home-hero-search-field {
            flex: 1 1 auto;
            min-width: 16rem;
          }
          .home-hero-search-submit {
            flex: 0 0 auto;
          }
        }
      `}</style>
    </div>
  );
}
