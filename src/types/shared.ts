import type { LOCALES } from "@/lib/locale";

/**
 * A published locale. Derived from the runtime tuple so the type and the
 * allow-list the middleware reads cannot disagree; the import is type-only,
 * which keeps this file free of runtime dependencies.
 */
export type Language = (typeof LOCALES)[number];
