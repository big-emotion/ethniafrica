import { vi } from "vitest";

/**
 * Every route but one calls into `@/api/v2/handlers/*`, which the contract
 * suite mocks generically (routeRegistry.extractHandlerImports). The one
 * exception is `GET /api/v2/keys/issue`, which talks to
 * `createAdminClient()` directly — this is its one hand-written mock.
 */
// @req REQ-033
export const ROUTE_OVERRIDES: Record<string, () => void> = {
  "GET /api/v2/keys/issue": () => {
    const noExistingKey = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                is: () => ({
                  maybeSingle: async () => ({ data: null, error: null }),
                }),
              }),
            }),
          }),
        }),
        insert: async () => ({ error: null }),
      }),
    };
    vi.doMock("@/lib/supabase/admin", () => ({
      createAdminClient: () => noExistingKey,
    }));
  },
};
