import "@testing-library/jest-dom/vitest";

// The Supabase modules under src/lib/supabase/ validate their configuration at
// module scope and throw when it is absent. Any test that transitively imports
// one — the whole v2 handler -> service -> query chain does — therefore fails
// at import time with zero tests collected, which reads as a broken suite
// rather than a missing variable.
//
// These are placeholders, not credentials: tests mock the Supabase client, so
// nothing ever dials the URL. Real values are only ever supplied through the
// environment, never committed.
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "http://localhost:54321";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test-service-role-key";

// happy-dom ships no Path2D. Every browser has had it since 2015, and the
// globe's texture painter uses it to place the committed basemap outline,
// so without a stand-in any test that mounts a globe would exercise the
// failure path instead of the real one.
if (typeof globalThis.Path2D === "undefined") {
  globalThis.Path2D = class {
    constructor(readonly d?: string) {}
  } as unknown as typeof Path2D;
}

// applyCorsHeaders omits Access-Control-Allow-Origin entirely when no origin is
// configured, so route tests asserting on that header need one. Tests that
// exercise the unconfigured case delete this variable themselves.
process.env.CORS_ALLOWED_ORIGIN ??= "http://localhost:3000";

// happy-dom 20.12 began shipping Element.animate, and its animations never
// reach onfinish while vitest holds the clock. useSlotReel books the next word
// from that callback, so under fake timers a reel settles on the word it opened
// on and stays there for good — eight assertions across the two hero suites
// turned red on the bump alone, with the hook untouched.
//
// Withdrawing the method restores the branch useSlotReel already documents for
// "an old browser, or the test environment", where the word changes without
// travelling. The suites assert the sequence of words, never the flourish, so
// nothing they cover is lost. This hook is the codebase's only WAAPI caller.
delete (Element.prototype as { animate?: unknown }).animate;
