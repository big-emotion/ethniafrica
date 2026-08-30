import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";

import {
  HomeHeroSeeds,
  SEED_POOLS,
  REEL_MS,
  MAX_CYCLES,
} from "../HomeHeroSeeds";

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
  const chips = screen.getAllByRole("button");
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

describe("HomeHeroSeeds — the three example queries", () => {
  // @req REQ-002
  it("opens on the first word of each pool", () => {
    render(<HomeHeroSeeds onPick={vi.fn()} />);

    SEED_POOLS.forEach((pool, index) => {
      expect(shownWord(index)).toBe(pool.words[0]);
    });
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
  // a way to stop. Engagement is that way, and it stops for good — once the
  // reader is aiming at a chip, a word that moves is a target that moves.
  // @req REQ-002
  it("stops for good once the reader engages", () => {
    render(<HomeHeroSeeds onPick={vi.fn()} />);

    const before = shownWord(0);
    fireEvent.pointerEnter(screen.getByRole("list"));
    advance(SEED_POOLS[0].dwellMs * 4 + REEL_MS);

    expect(shownWord(0)).toBe(before);
  });

  // @req REQ-002
  it("never starts under reduced motion", () => {
    setReducedMotion(true);
    render(<HomeHeroSeeds onPick={vi.fn()} />);

    advance(SEED_POOLS[0].dwellMs * 5);

    expect(shownWord(0)).toBe(SEED_POOLS[0].words[0]);
  });

  // A perpetual ticker is noise by the time the reader has read it twice.
  // @req REQ-002
  it("settles after a bounded number of cycles", () => {
    render(<HomeHeroSeeds onPick={vi.fn()} />);

    const pool = SEED_POOLS[0];
    advance(pool.startDelayMs + (pool.dwellMs + REEL_MS) * (MAX_CYCLES + 4));
    const settled = shownWord(0);

    advance((pool.dwellMs + REEL_MS) * 3);
    expect(shownWord(0)).toBe(settled);
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
