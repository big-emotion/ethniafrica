import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";

import {
  HEADLINE_DWELL_MS,
  HEADLINE_START_DELAY_MS,
  HomeHeadlineReel,
} from "../HomeHeadlineReel";
import { REEL_MS } from "@/hooks/use-slot-reel";

const SEGMENTS = [
  "790 peuples",
  "748 langues",
  "54 pays",
  "24 familles",
  "3 134 appellations",
];

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

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

function shownSegment(container: HTMLElement): string {
  return container
    .querySelector("[data-reel-current]")!
    .textContent!.trim()
    .replace(/\s+/g, " ");
}

beforeEach(() => {
  vi.useFakeTimers();
  setReducedMotion(false);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("HomeHeadlineReel — the class the headline names", () => {
  // @req REQ-115
  it("opens on the first class rather than on a random one", () => {
    const { container } = render(<HomeHeadlineReel segments={SEGMENTS} />);

    expect(shownSegment(container)).toBe("790 peuples");
  });

  // @req REQ-115
  it("turns to the next class once the dwell has passed", () => {
    const { container } = render(<HomeHeadlineReel segments={SEGMENTS} />);

    advance(HEADLINE_START_DELAY_MS + REEL_MS + 1);

    expect(shownSegment(container)).toBe("748 langues");
  });

  // The reel sits on its own line of a three-line headline, and that line is
  // as wide as the segment in it. Without a ghost, turning from
  // "3 134 appellations" to "54 pays" would shrink the line by 300px at 1440
  // and the title would twitch on every turn. The ghost fixes the width at the
  // longest segment from the first paint, so nothing moves.
  // @req REQ-115
  it("carries a ghost of every segment so a turn never reflows the title", () => {
    const { container } = render(<HomeHeadlineReel segments={SEGMENTS} />);

    const sizer = container.querySelector("[data-reel-sizer]")!;

    for (const segment of SEGMENTS) {
      expect(sizer.textContent).toContain(segment);
    }
  });

  // The heading's accessible name is set once, on the h1 itself. Were the reel
  // exposed, the name would read "790 peuples 748 langues" mid-roll and the
  // landmark would change every three seconds.
  // @req REQ-115
  it("is hidden from the accessibility tree", () => {
    const { container } = render(<HomeHeadlineReel segments={SEGMENTS} />);

    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  // A word being read must not move under the reader.
  // @req REQ-115
  it("pauses while a pointer rests on it and takes up again on leaving", () => {
    const { container } = render(<HomeHeadlineReel segments={SEGMENTS} />);
    const reel = container.firstElementChild!;

    fireEvent.pointerEnter(reel);
    advance(HEADLINE_START_DELAY_MS + (HEADLINE_DWELL_MS + REEL_MS) * 3);
    expect(shownSegment(container)).toBe("790 peuples");

    fireEvent.pointerLeave(reel);
    advance(HEADLINE_DWELL_MS + REEL_MS + 1);
    expect(shownSegment(container)).toBe("748 langues");
  });

  // WCAG 2.2.2. A reader composing a query is owed a still headline above what
  // they are typing, and unlike the chips the h1 cannot be hovered by someone
  // using a keyboard — so reaching the field is the stop that has to work.
  // @req REQ-115
  it("stops for the life of the page once the search field takes focus", () => {
    const { container } = render(
      <div>
        <HomeHeadlineReel segments={SEGMENTS} />
        <form role="search">
          <input aria-label="Chercher" />
        </form>
      </div>
    );

    act(() => {
      screen.getByLabelText("Chercher").focus();
    });
    advance(HEADLINE_START_DELAY_MS + (HEADLINE_DWELL_MS + REEL_MS) * 4);

    expect(shownSegment(container)).toBe("790 peuples");
  });

  // Reduced motion means still, not fast: the motion tokens collapse every
  // duration to 0.01ms, which would spin this at a hundred turns a second.
  // @req REQ-115
  it("never turns under prefers-reduced-motion", () => {
    setReducedMotion(true);
    const { container } = render(<HomeHeadlineReel segments={SEGMENTS} />);

    advance(HEADLINE_START_DELAY_MS + (HEADLINE_DWELL_MS + REEL_MS) * 5);

    expect(shownSegment(container)).toBe("790 peuples");
  });
});
