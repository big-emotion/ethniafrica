/**
 * Run an async audit over a list, a bounded number at a time.
 *
 * The a11y gate swept 63 Storybook stories through a single browser page in a
 * `for` loop — ~9 s each, 589 s total, on the one workflow that actually gates
 * a merge. The work is independent per story, so the loop was serialising for
 * no reason other than sharing one page.
 *
 * A rejection is returned in place rather than thrown, because the sweep has to
 * report every violation it found: one story that fails to render must not
 * cancel the audit of the sixty-two others.
 */
export async function sweepInParallel<Item, Outcome>(
  items: readonly Item[],
  laneCount: number,
  audit: (item: Item, index: number) => Promise<Outcome>
): Promise<(Outcome | Error)[]> {
  const outcomes = new Array<Outcome | Error>(items.length);
  let nextIndex = 0;

  const lane = async (): Promise<void> => {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      try {
        outcomes[index] = await audit(items[index], index);
      } catch (failure) {
        outcomes[index] =
          failure instanceof Error ? failure : new Error(String(failure));
      }
    }
  };

  const lanes = Math.min(Math.max(laneCount, 1), items.length);
  await Promise.all(Array.from({ length: lanes }, lane));

  return outcomes;
}
