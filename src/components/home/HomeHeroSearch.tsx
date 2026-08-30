"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SEARCH_EMPTY_LINK_LABEL } from "@/components/ui/EmptyState";
import { SEARCH_ENTITY_ACCENT } from "@/components/search/searchEntityAccent";
import { search as searchCorpus } from "@/lib/afrikLoader";
import {
  getCountryRoute,
  getFamilyRoute,
  getLocalizedRoute,
  getPeopleRoute,
} from "@/lib/routing";
import { cn } from "@/lib/utils";
import type { SearchEntityType, SearchResult } from "@/types/afrik-frontend";
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
 * the shape `/api/v2/search` already answers in (`{ peoples, countries,
 * families }`, never one flat list). The taxonomy is taught in the result,
 * where it costs the reader nothing, instead of demanded as a precondition.
 *
 * The three seed chips carry the same teaching without the motion: they show
 * all three entity kinds at once, where a rotating placeholder shows one at a
 * time and disappears at the exact moment the reader focuses the field.
 */

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;
/** Enough to prove the kind exists without turning the band into a listing. */
const MAX_PER_GROUP = 3;

/** One per entity kind, so the row states the corpus' three shapes at a glance. */
// @req REQ-002
export const SEED_QUERIES = ["Yoruba", "Cameroun", "Bantou"];

// Plural of the singular labels in SEARCH_ENTITY_ACCENT — a group heads a set.
// The accent still comes from that one table, so a kind's colour is assigned
// in a single place across the whole product.
const GROUPS: { type: SearchEntityType; heading: string }[] = [
  { type: "people", heading: "Peuples" },
  { type: "country", heading: "Pays" },
  { type: "languageFamily", heading: "Familles linguistiques" },
];

// Hoisted, not written inline as a default parameter: a fresh closure on every
// render is a fresh dependency for the effect below, which resets state on its
// way through and so re-renders — one unstable identity is an infinite loop.
const fetchFromCorpus = (query: string) => searchCorpus(query);

function ficheHref(result: SearchResult, language: Language): string {
  if (result.type === "country") return getCountryRoute(language, result.id);
  if (result.type === "languageFamily")
    return getFamilyRoute(language, result.id);
  return getPeopleRoute(language, result.id);
}

export interface HomeHeroSearchProps {
  language?: Language;
  /** Injected by tests; defaults to the corpus search every other surface uses. */
  fetchResults?: (query: string) => Promise<SearchResult[]>;
}

// @req REQ-002
export function HomeHeroSearch({
  language = "fr",
  fetchResults = fetchFromCorpus,
}: HomeHeroSearchProps = {}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [answered, setAnswered] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputId = useId();
  const listboxId = useId();
  // Only the newest query may write to state: a slow "yor" landing after
  // "yoruba" would otherwise repopulate the panel with the wrong answer.
  const latestQuery = useRef(0);

  const trimmed = query.trim();
  const longEnough = trimmed.length >= MIN_QUERY_LENGTH;

  useEffect(() => {
    if (!longEnough) {
      // Keeping the array's identity when it is already empty is what lets
      // React bail out instead of scheduling another render of this effect.
      setResults((current) => (current.length === 0 ? current : []));
      setAnswered(false);
      return;
    }

    const ticket = ++latestQuery.current;
    const timer = setTimeout(async () => {
      const found = await fetchResults(trimmed);
      if (ticket !== latestQuery.current) return;
      setResults(found);
      setAnswered(true);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [trimmed, longEnough, fetchResults]);

  const groups = useMemo(() => {
    let cursor = 0;
    return GROUPS.map(({ type, heading }) => {
      const options = results
        .filter((result) => result.type === type)
        .slice(0, MAX_PER_GROUP)
        .map((result) => ({ result, index: cursor++ }));
      return { type, heading, options };
    }).filter((group) => group.options.length > 0);
  }, [results]);

  const flat = useMemo(
    () =>
      groups.flatMap((group) => group.options.map((option) => option.result)),
    [groups]
  );

  const open = longEnough && answered && !dismissed;
  const showListbox = open && flat.length > 0;

  useEffect(() => {
    setActiveIndex(-1);
  }, [flat.length, trimmed]);

  const optionId = (index: number) => `${listboxId}-option-${index}`;

  const goTo = (result: SearchResult) =>
    router.push(ficheHref(result, language));

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setDismissed(true);
      setActiveIndex(-1);
      return;
    }
    if (!showListbox) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, flat.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      goTo(flat[activeIndex]);
    }
  };

  const runSeed = (seed: string) => {
    setQuery(seed);
    setDismissed(false);
  };

  return (
    <div className="home-hero-search afh-accent-ocre">
      {/* A plain GET form, not a router push: submitting then works before
          React has hydrated, and the panel below is the enhancement rather
          than the feature. The page it lands on shows everything the panel
          caps at three per kind, with the filters — which is how a reader
          leaves the hero without dead-ending. */}
      <form
        role="search"
        method="get"
        action={getLocalizedRoute(language, "search")}
        className="home-hero-search-form"
      >
        <label htmlFor={inputId} className="sr-only">
          Rechercher un peuple, un pays ou une famille linguistique
        </label>

        <div className="home-hero-search-field">
          <Search
            aria-hidden="true"
            className="size-5 shrink-0 text-afh-text-soft"
          />
          <input
            id={inputId}
            name="q"
            role="combobox"
            aria-expanded={showListbox}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={
              activeIndex >= 0 ? optionId(activeIndex) : undefined
            }
            // A rotating placeholder would rename the control mid-sentence for
            // a screen reader; the <label> above is what carries the name, and
            // this string only states what the corpus holds.
            placeholder="Un peuple, un pays, une langue…"
            type="search"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setDismissed(false);
            }}
            onKeyDown={handleKeyDown}
          />
        </div>

        <Button
          type="submit"
          variant="accent"
          className="home-hero-search-submit"
        >
          Rechercher
        </Button>
      </form>

      <ul className="home-hero-search-seeds" aria-label="Exemples de recherche">
        {SEED_QUERIES.map((seed) => (
          <li key={seed}>
            <button type="button" onClick={() => runSeed(seed)}>
              {seed}
            </button>
          </li>
        ))}
      </ul>

      <div role="status" aria-live="polite" className="sr-only">
        {open
          ? flat.length > 0
            ? `${flat.length} suggestion${flat.length > 1 ? "s" : ""}`
            : "Aucune suggestion"
          : ""}
      </div>

      {showListbox && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Suggestions"
          className="home-hero-search-panel"
        >
          {groups.map((group) => (
            <div
              key={group.type}
              role="group"
              aria-label={group.heading}
              className={SEARCH_ENTITY_ACCENT[group.type].accentScopeClassName}
            >
              <p aria-hidden="true" className="home-hero-search-group">
                {group.heading}
              </p>
              {group.options.map(({ result, index }) => (
                <Link
                  key={result.id}
                  id={optionId(index)}
                  role="option"
                  aria-selected={index === activeIndex}
                  href={ficheHref(result, language)}
                  className={cn(
                    "home-hero-search-option",
                    index === activeIndex && "is-active"
                  )}
                  onMouseEnter={() => setActiveIndex(index)}
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
          <Link href={getLocalizedRoute(language, "families")}>
            {SEARCH_EMPTY_LINK_LABEL}
          </Link>
        </div>
      )}

      <style>{`
        .home-hero-search {
          margin-top: 24px;
          text-align: left;
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
          flex: 1 1 12rem;
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

        .home-hero-search-submit {
          min-height: 52px;
          flex: 1 1 8rem;
        }

        .home-hero-search-seeds {
          display: flex;
          flex-wrap: wrap;
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

        /* In the flow, not absolutely positioned: .home-hero sets
           overflow:hidden for its full-bleed 100vw inset, so an overlay panel
           is clipped at the band's edge. Pushing the content down also keeps
           the suggestions above the phone keyboard. */
        .home-hero-search-panel {
          margin-top: 12px;
          padding: 8px;
          background: var(--afh-surface);
          border: 1px solid var(--afh-border);
          border-radius: var(--afh-radius-lg);
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
            margin-top: 28px;
          }
        }
      `}</style>
    </div>
  );
}
