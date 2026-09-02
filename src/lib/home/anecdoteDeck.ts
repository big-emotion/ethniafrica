/**
 * The reading order of the anecdotes page, expressed as identifiers alone.
 *
 * The order used to be a shuffled array of whole facts, drawn on the server
 * and handed to a client component. That serialised the entire bank into the
 * page's payload on every visit: at twenty-four facts it cost 9 Ko gzipped,
 * and the bank is the one part of this surface designed to keep growing. A
 * reader who opens one anecdote and leaves paid for all of them.
 *
 * Splitting the order from the prose fixes that. The page sends the order —
 * identifiers, a few hundred bytes — plus the single card it is opening on,
 * so the first screen is still complete server-side with no flash. The prose
 * of the other cards arrives in one deferred chunk the first time the reader
 * actually turns one.
 *
 * This module holds no prose, which is the whole point: a client component may
 * import it without dragging the bank behind it.
 */

/**
 * The bank in a drawn order, every entry once before any entry twice.
 *
 * A roll of the dice per press hands the reader the same anecdote twice
 * within a handful of turns, and a reader who sees a repeat concludes the
 * bank is smaller than it is. Exhausting a permutation guarantees the last
 * press of a deck shows the last unseen card.
 *
 * `avoidLeading` covers the seam between two permutations — without it the
 * final card of one deck can open the next, which is the one repeat a reader
 * is certain to notice.
 */
// @req REQ-113
export function shuffleAnecdoteOrder(
  ids: string[],
  random: () => number = Math.random,
  avoidLeading: string | null = null
): string[] {
  const order = [...ids];

  for (let index = order.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [order[index], order[target]] = [order[target], order[index]];
  }

  if (order.length > 1 && avoidLeading !== null && order[0] === avoidLeading) {
    [order[0], order[1]] = [order[1], order[0]];
  }

  return order;
}
