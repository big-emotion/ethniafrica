/// <reference lib="webworker" />

import { solveChallenge } from "@/lib/antibot/proofOfWork";

/**
 * The search, off the main thread.
 *
 * At 20 bits the loop runs roughly a million hashes — about a second on a
 * desktop, several on a low-end phone. On the main thread that is a frozen
 * page: no scrolling, no typing, no cancel button. In a worker it is invisible,
 * and the dialog stays usable while it runs.
 *
 * It imports the same `solveChallenge` the server's test suite uses, so the
 * two sides cannot drift on what counts as solved.
 */

interface SolveRequest {
  salt: string;
  difficultyBits: number;
}

self.onmessage = async (event: MessageEvent<SolveRequest>) => {
  const { salt, difficultyBits } = event.data;

  try {
    const nonce = await solveChallenge({ salt, difficultyBits });
    // A null nonce means the attempt bound was reached — the difficulty is
    // mistuned, not the reader unlucky. Reported as a failure rather than
    // retried, so it surfaces instead of spinning the device.
    self.postMessage(nonce === null ? { error: "exhausted" } : { nonce });
  } catch {
    self.postMessage({ error: "failed" });
  }
};
