import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  issueChallenge,
  meetsDifficulty,
  solveChallenge,
  verifyProof,
  type Challenge,
} from "@/lib/antibot/proofOfWork";

/**
 * The anti-bot control, with nothing in it that leaves the machine.
 *
 * A challenge is a signed statement — "this salt, at this difficulty, until
 * this instant" — that the server can re-verify without remembering it. The
 * only thing it must remember is that the salt was spent, which is the one job
 * left to Postgres.
 *
 * `solveChallenge` is the same loop the browser worker runs. Testing the
 * solver and the verifier against each other is what proves the two agree on
 * what "solved" means; asserting the hash by hand would only restate the
 * implementation.
 */

const SECRET = "test-hmac-secret-value";

beforeEach(() => {
  vi.stubEnv("ANTIBOT_HMAC_SECRET", SECRET);
  vi.useRealTimers();
});

// Low enough to solve in milliseconds. Difficulty is a deployment setting, not
// a property of the algorithm, so the suite has no business paying for 20 bits.
const EASY = 8;

async function issued(overrides: Partial<Challenge> = {}) {
  const challenge = await issueChallenge({ difficultyBits: EASY });
  return { ...challenge, ...overrides };
}

describe("proof of work", () => {
  // @req REQ-012
  it("accepts a challenge the browser actually solved", async () => {
    const challenge = await issued();
    const nonce = await solveChallenge(challenge);

    await expect(verifyProof({ ...challenge, nonce })).resolves.toBe(
      "verified"
    );
  });

  // @req REQ-012
  it("refuses a nonce that does not meet the difficulty", async () => {
    const challenge = await issued();

    // Find a nonce that provably fails rather than assuming an arbitrary
    // string does: at 8 bits, 255 of 256 candidates fail, and "almost always"
    // is a flaky test. The search hashes directly instead of going through
    // `verifyProof`, which would re-import an HMAC key on every candidate —
    // a thousand of those slowed the whole suite enough to time out unrelated
    // files.
    const digest = async (nonce: string) =>
      new Uint8Array(
        await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(`${challenge.salt}${nonce}`)
        )
      );

    let wrong = "";
    for (let candidate = 0; candidate < 1000 && !wrong; candidate += 1) {
      const nonce = `x${candidate}`;
      if (!meetsDifficulty(await digest(nonce), EASY)) wrong = nonce;
    }

    expect(wrong).not.toBe("");
    await expect(verifyProof({ ...challenge, nonce: wrong })).resolves.toBe(
      "rejected"
    );
  });

  /**
   * Without this the difficulty is a client-side suggestion: a bot would send
   * `difficultyBits: 0` with a trivially-found nonce, and a verifier that
   * trusted the body would accept it.
   */
  // @req REQ-012
  it("refuses a challenge whose difficulty was lowered in transit", async () => {
    const challenge = await issued();
    const nonce = await solveChallenge(challenge);

    await expect(
      verifyProof({ ...challenge, difficultyBits: 1, nonce })
    ).resolves.toBe("rejected");
  });

  // @req REQ-012
  it("refuses a forged signature", async () => {
    const challenge = await issued();
    const nonce = await solveChallenge(challenge);

    await expect(
      verifyProof({ ...challenge, signature: "0".repeat(64), nonce })
    ).resolves.toBe("rejected");
  });

  // @req REQ-012
  it("refuses a challenge that has expired", async () => {
    const challenge = await issueChallenge({
      difficultyBits: EASY,
      ttlMs: -1_000,
    });
    const nonce = await solveChallenge(challenge);

    await expect(verifyProof({ ...challenge, nonce })).resolves.toBe(
      "rejected"
    );
  });

  /**
   * The secret is what makes a signature unforgeable, so its absence is not a
   * configuration detail to shrug at. It answers `unavailable`, which the API
   * turns into a 503 — the same shape the Turnstile verifier used, so the flag
   * handler needs no new branch.
   */
  // @req REQ-012
  it("reports itself unavailable rather than accepting anything, with no secret", async () => {
    const challenge = await issued();
    const nonce = await solveChallenge(challenge);
    vi.stubEnv("ANTIBOT_HMAC_SECRET", "");

    await expect(verifyProof({ ...challenge, nonce })).resolves.toBe(
      "unavailable"
    );
  });

  // @req REQ-012
  it("issues a different salt every time", async () => {
    const salts = await Promise.all(
      Array.from({ length: 20 }, () => issueChallenge({ difficultyBits: EASY }))
    );

    expect(new Set(salts.map((c) => c.salt)).size).toBe(20);
  });

  // @req REQ-012
  it("counts difficulty in leading zero bits, not bytes", () => {
    // 0x0f = 0000 1111 — four leading zero bits, and no more.
    const fourZeroBits = new Uint8Array([0x0f, 0xff]);

    expect(meetsDifficulty(fourZeroBits, 4)).toBe(true);
    expect(meetsDifficulty(fourZeroBits, 5)).toBe(false);
  });
});
