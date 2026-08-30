/**
 * The anti-bot control, computed in the reader's own browser and verified here.
 *
 * The reader is asked nothing — no puzzle, no image, no checkbox. Their
 * browser searches for a `nonce` whose SHA-256 begins with enough zero bits,
 * and the server confirms it in one hash. That asymmetry is the whole idea:
 * finding a solution costs about a second, checking one costs nothing, so a
 * single report is free and ten thousand are not.
 *
 * It replaces Cloudflare Turnstile. Nothing here reaches the network, so no
 * visitor data leaves the infrastructure — which is what `DEC-009` asks for
 * and what the privacy policy can now honestly claim.
 *
 * This module is deliberately pure: no database, no request, no environment
 * beyond the signing secret. The replay defence — a salt may be spent once —
 * lives in `src/api/v2/services/antibot.ts`, because it is the one part that
 * needs a memory.
 *
 * Runs unchanged in the browser worker and on the server: it uses only Web
 * Crypto, which both provide.
 */

const DEFAULT_DIFFICULTY_BITS = 20;
const DEFAULT_TTL_MS = 5 * 60 * 1000;

/**
 * The upper bound on a search, so a mistuned difficulty cannot spin a device
 * forever. At 20 bits a solution is expected in ~1M attempts; 50M is ~50×
 * that, far enough out that reaching it means the difficulty is wrong rather
 * than the reader unlucky.
 */
// @req REQ-012
export const MAX_SOLVE_ATTEMPTS = 50_000_000;

export interface Challenge {
  salt: string;
  difficultyBits: number;
  /** Epoch milliseconds. */
  expiresAt: number;
  signature: string;
}

export interface Proof extends Challenge {
  nonce: string;
}

export type ProofVerdict = "verified" | "rejected" | "unavailable";

const encoder = new TextEncoder();

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256(input: string): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(input));
  return new Uint8Array(digest);
}

/**
 * Leading zero *bits*, not bytes.
 *
 * Bytes would make difficulty a step function with a factor of 256 between
 * rungs — 8 bits is instant, 16 is a second, 24 is minutes. Bits give a dial
 * that can actually be tuned against a low-end phone.
 */
// @req REQ-012
export function meetsDifficulty(digest: Uint8Array, bits: number): boolean {
  const wholeBytes = Math.floor(bits / 8);

  for (let index = 0; index < wholeBytes; index += 1) {
    if (digest[index] !== 0) return false;
  }

  const remainder = bits % 8;
  if (remainder === 0) return true;

  // The remaining bits must be zero at the top of the next byte: for 4 bits,
  // 0b11110000 masks them off and the result must be 0.
  const mask = 0xff << (8 - remainder);
  return (digest[wholeBytes] & mask) === 0;
}

function signingSecret(): string {
  return process.env.ANTIBOT_HMAC_SECRET ?? "";
}

async function sign(
  secret: string,
  salt: string,
  difficultyBits: number,
  expiresAt: number
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${salt}.${difficultyBits}.${expiresAt}`)
  );
  return toHex(new Uint8Array(mac));
}

/**
 * Constant-time comparison.
 *
 * `a === b` on a signature leaks, through timing, how many leading characters
 * were right — enough to reconstruct one byte at a time. The cost of avoiding
 * that is a loop over 64 characters.
 */
function equalsInConstantTime(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let difference = 0;
  for (let index = 0; index < a.length; index += 1) {
    difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return difference === 0;
}

export interface IssueOptions {
  difficultyBits?: number;
  ttlMs?: number;
}

/**
 * Mint a challenge. The signature is what lets the server verify it later
 * without having stored anything about it — the database remembers only that
 * a salt exists so it can refuse it the second time.
 */
// @req REQ-012
export async function issueChallenge(
  options: IssueOptions = {}
): Promise<Challenge> {
  const difficultyBits = options.difficultyBits ?? configuredDifficulty();
  const expiresAt = Date.now() + (options.ttlMs ?? DEFAULT_TTL_MS);
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));

  return {
    salt,
    difficultyBits,
    expiresAt,
    signature: await sign(signingSecret(), salt, difficultyBits, expiresAt),
  };
}

// @req REQ-012
export function configuredDifficulty(): number {
  const raw = Number(process.env.ANTIBOT_DIFFICULTY_BITS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_DIFFICULTY_BITS;
}

/**
 * Verify a solved challenge.
 *
 * The signature is checked *before* the hash, and it covers `difficultyBits`
 * — without that, a bot would send `difficultyBits: 1` with a nonce found in
 * two attempts and a verifier trusting the body would accept it. The
 * difficulty a client asks to be judged at is not a client's decision.
 *
 * Answers `unavailable` rather than `rejected` when no secret is configured,
 * so the API returns 503 instead of silently rejecting every honest reader —
 * the same three-verdict shape the Turnstile verifier had, which is why the
 * flag handler needed no new branch.
 */
// @req REQ-012
export async function verifyProof(proof: Proof): Promise<ProofVerdict> {
  const secret = signingSecret();
  if (!secret) return "unavailable";

  const expected = await sign(
    secret,
    proof.salt,
    proof.difficultyBits,
    proof.expiresAt
  );
  if (!equalsInConstantTime(expected, proof.signature)) return "rejected";

  if (!Number.isFinite(proof.expiresAt) || proof.expiresAt <= Date.now()) {
    return "rejected";
  }

  const digest = await sha256(`${proof.salt}${proof.nonce}`);
  return meetsDifficulty(digest, proof.difficultyBits)
    ? "verified"
    : "rejected";
}

/**
 * The search loop, shared with the browser worker so the two sides cannot
 * disagree about what counts as solved.
 *
 * Returns null if the bound is reached, which the caller reports as a failure
 * to verify rather than retrying forever on a device that cannot afford it.
 */
// @req REQ-012
export async function solveChallenge(
  challenge: Pick<Challenge, "salt" | "difficultyBits">,
  maxAttempts = MAX_SOLVE_ATTEMPTS
): Promise<string | null> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const nonce = String(attempt);
    const digest = await sha256(`${challenge.salt}${nonce}`);
    if (meetsDifficulty(digest, challenge.difficultyBits)) return nonce;
  }
  return null;
}
