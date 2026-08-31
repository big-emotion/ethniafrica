/**
 * Stands in for the `server-only` package under vitest.
 *
 * The real package ships a module that throws on import, which is exactly what
 * makes it a build-time guard: a client component importing a server module
 * fails the bundle. Vitest has no client/server boundary, so that throw would
 * only mean every suite touching a guarded module collects zero tests.
 *
 * Aliasing it away removes the throw, not the guarantee — the guard is enforced
 * by `next build`, and `src/lib/supabase/__tests__/admin-server-isolation.test.ts`
 * asserts the import is still declared.
 */
export {};
