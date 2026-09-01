import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within, act, fireEvent } from "@testing-library/react";

import {
  DESKTOP_SEED_BREAKPOINT_PX,
  HomeHeroSeeds,
  seedPools,
  REEL_MS,
} from "../HomeHeroSeeds";
import { FALLBACK_SEED_WORDS } from "@/lib/home/seedWords";

/** What the row turns through when the page injects nothing. */
const SEED_POOLS = seedPools(FALLBACK_SEED_WORDS);

function setReducedMotion(reduced: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduced && query.includes("prefers-reduced-motion"),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onchange: null,
  })) as unknown as typeof window.matchMedia;
}

/** The visible word of one reel, read the way a reader sees it. */
function shownWord(poolIndex: number): string {
  const chips = screen.getAllByRole("button", { hidden: true });
  return chips[poolIndex]
    .querySelector("[data-reel-current]")!
    .textContent!.trim();
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

/** Past the reel's start delay and one full roll. */
function advancePastFirstRoll(poolIndex: number) {
  advance(SEED_POOLS[poolIndex].startDelayMs + REEL_MS + 1);
}

beforeEach(() => {
  vi.useFakeTimers();
  setReducedMotion(false);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("HomeHeroSeeds — the example queries", () => {
  // The compact mockup has one example for each searchable entity kind. The
  // wide mockup adds a second people example, but its word still comes from
  // the server-provided corpus pool rather than from presentation code.
  // @req REQ-002
  it("shows three corpus chips on mobile and adds a fourth on desktop", () => {
    const drawn = {
      people: ["Baoulé", "Sérère", "Yoruba"],
      country: ["Togo", "Ghana"],
      languageFamily: ["Songhaï", "Oubanguienne"],
    };
    const { container } = render(
      <HomeHeroSeeds onPick={vi.fn()} words={drawn} />
    );

    const chips = container.querySelectorAll(".home-hero-search-seeds > li");
    expect(chips).toHaveLength(4);
    expect(chips[3]).toHaveClass("home-hero-seed-desktop");
    expect(
      within(chips[3] as HTMLElement).getByRole("button", { hidden: true })
    ).toHaveAccessibleName("Sérère");

    const css = container.querySelector("style")?.textContent ?? "";
    expect(css).toContain(".home-hero-seed-desktop");
    expect(css).toContain("display: none");
    expect(css).toContain(
      `@media (min-width: ${DESKTOP_SEED_BREAKPOINT_PX}px)`
    );
  });

  // @req REQ-002
  it("opens on the first word of each pool", () => {
    render(<HomeHeroSeeds onPick={vi.fn()} />);

    SEED_POOLS.forEach((pool, index) => {
      expect(shownWord(index)).toBe(pool.words[0]);
    });
  });

  // The desktop-only chip draws from the same people pool as the first chip.
  // Keeping their offset stable prevents a staggered first roll from briefly
  // presenting the same example twice in the approved four-chip layout.
  // @req REQ-002
  it("keeps the two desktop people examples distinct after a roll", () => {
    render(<HomeHeroSeeds onPick={vi.fn()} />);

    advancePastFirstRoll(0);

    expect(shownWord(3)).not.toBe(shownWord(0));
  });

  // The word is the button's whole label, so it is also its accessible name —
  // there is no second string that could drift away from what is on screen.
  // @req REQ-002
  it("names each chip with the word it is showing", () => {
    render(<HomeHeroSeeds onPick={vi.fn()} />);

    advancePastFirstRoll(0);

    const word = shownWord(0);
    expect(screen.getByRole("button", { name: word })).toBeInTheDocument();
  });

  // @req REQ-002
  it("advances a reel past its own dwell", () => {
    render(<HomeHeroSeeds onPick={vi.fn()} />);

    expect(shownWord(0)).toBe(SEED_POOLS[0].words[0]);
    advancePastFirstRoll(0);
    expect(shownWord(0)).toBe(SEED_POOLS[0].words[1]);
  });

  // Three reels turning together read as one blinking block rather than three
  // examples. The dwells are non-commensurate so they never resynchronise.
  // @req REQ-002
  it("does not turn the three reels together", () => {
    render(<HomeHeroSeeds onPick={vi.fn()} />);

    advancePastFirstRoll(0);

    expect(shownWord(0)).toBe(SEED_POOLS[0].words[1]);
    expect(shownWord(1)).toBe(SEED_POOLS[1].words[0]);
    expect(shownWord(2)).toBe(SEED_POOLS[2].words[0]);
  });

  // WCAG 2.2.2: motion that starts on its own and outlasts five seconds needs
  // a way to stop, and resting the pointer on the row is that way — a word
  // being aimed at must not move. It is a pause and not an end, because the
  // row is the only place the home states the breadth of the corpus, and a
  // pointer crossing it on the way to the field would otherwise spend it.
  // @req REQ-002
  it("holds still while the pointer rests on the row", () => {
    render(<HomeHeroSeeds onPick={vi.fn()} />);

    const before = shownWord(0);
    fireEvent.pointerEnter(screen.getByRole("list"));
    advance(SEED_POOLS[0].dwellMs * 4 + REEL_MS);

    expect(shownWord(0)).toBe(before);
  });

  // @req REQ-002
  it("takes up again once the pointer leaves the row", () => {
    render(<HomeHeroSeeds onPick={vi.fn()} />);

    const row = screen.getByRole("list");
    fireEvent.pointerEnter(row);
    advance(SEED_POOLS[0].dwellMs * 3);
    const held = shownWord(0);

    fireEvent.pointerLeave(row);
    advance(SEED_POOLS[0].startDelayMs + SEED_POOLS[0].dwellMs + REEL_MS + 1);

    expect(shownWord(0)).not.toBe(held);
  });

  // The field is the one arrival that ends the teaching: a reader composing a
  // query is owed a still row beside what they are typing, and the chip they
  // may be about to click must not change word underneath the click.
  // @req REQ-002
  it("stops for good once the reader reaches the field", () => {
    const { rerender } = render(<HomeHeroSeeds onPick={vi.fn()} />);

    advancePastFirstRoll(0);
    const before = shownWord(0);

    rerender(<HomeHeroSeeds onPick={vi.fn()} engaged />);
    advance(SEED_POOLS[0].dwellMs * 5 + REEL_MS);

    expect(shownWord(0)).toBe(before);
  });

  // @req REQ-002
  it("never starts under reduced motion", () => {
    setReducedMotion(true);
    render(<HomeHeroSeeds onPick={vi.fn()} />);

    advance(SEED_POOLS[0].dwellMs * 5);

    expect(shownWord(0)).toBe(SEED_POOLS[0].words[0]);
  });

  // The reel used to stop for good after six turns, on the theory that a
  // perpetual ticker is noise once read twice. It measured the wrong thing:
  // the cap counts turns since the page loaded, not turns this reader saw, so
  // a home left open — or read from the second band down — showed a dead row.
  // The reader who has read enough now says so by hovering, or by typing.
  // @req REQ-002
  it("is still turning long after the old six-turn cap", () => {
    render(<HomeHeroSeeds onPick={vi.fn()} />);

    const pool = SEED_POOLS[0];
    advance(pool.startDelayMs + (pool.dwellMs + REEL_MS) * 12);
    const late = shownWord(0);

    advance(pool.dwellMs + REEL_MS + 1);
    expect(shownWord(0)).not.toBe(late);
  });

  // @req REQ-002
  it("runs the word it is currently showing, not the one it opened on", () => {
    const onPick = vi.fn();
    render(<HomeHeroSeeds onPick={onPick} />);

    advancePastFirstRoll(0);
    const visible = shownWord(0);
    fireEvent.click(screen.getAllByRole("button")[0]);

    expect(onPick).toHaveBeenCalledWith(visible);
    expect(visible).not.toBe(SEED_POOLS[0].words[0]);
  });

  // The words are the corpus' business, not the component's: the page draws
  // ten per kind on every request and hands them down. A row that quietly
  // ignored them would look right and go on teaching the same twelve names.
  // @req REQ-002
  it("turns through the words the page hands it", () => {
    const drawn = {
      people: ["Baoulé", "Sérère"],
      country: ["Togo", "Ghana"],
      languageFamily: ["Songhaï", "Oubanguienne"],
    };
    render(<HomeHeroSeeds onPick={vi.fn()} words={drawn} />);

    expect(shownWord(0)).toBe("Baoulé");
    advancePastFirstRoll(0);
    expect(shownWord(0)).toBe("Sérère");
  });

  // A word swapping itself is not an announcement. Without this a screen
  // reader recites the three reels for as long as the page is open.
  // @req REQ-002
  it("is not a live region, and hides the width ghost", () => {
    const { container } = render(<HomeHeroSeeds onPick={vi.fn()} />);

    expect(container.querySelector("[aria-live]")).toBeNull();
    container.querySelectorAll("[data-reel-sizer]").forEach((ghost) => {
      expect(ghost).toHaveAttribute("aria-hidden", "true");
    });
  });

  // The chip must not resize as its word changes: a wider word would reflow
  // the row and move the two chips beside it out from under the reader.
  // @req REQ-002
  it("carries every word of its pool in the width ghost", () => {
    const { container } = render(<HomeHeroSeeds onPick={vi.fn()} />);

    const ghosts = container.querySelectorAll("[data-reel-sizer]");
    expect(ghosts).toHaveLength(SEED_POOLS.length);
    SEED_POOLS.forEach((pool, index) => {
      pool.words.forEach((word) => {
        expect(ghosts[index].textContent).toContain(word);
      });
    });
  });
});
