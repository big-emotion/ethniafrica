/**
 * Run an async task over a list, a bounded number at a time.
 *
 * Two callers, the same shape of waste. The a11y gate swept 367 Storybook
 * stories through a single browser page in a `for` loop; the AFRIK loader walks
 * 800 people fiches through four sequential round trips each. Both were
 * serialising work that is independent per item.
 *
 * A rejection is returned in place rather than thrown, because both callers
 * have to report everything they found: one story that fails to render, or one
 * fiche the database refuses, must not cancel the other 799.
 *
 * @req REQ-032
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
