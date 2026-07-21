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
