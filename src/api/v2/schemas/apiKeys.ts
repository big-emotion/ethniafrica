/**
 * Zod schema for POST /v2/keys (self-service API key creation, ETNI-81).
 */

import { z } from "zod";

// @req REQ-056
export const createApiKeySchema = z.object({
  label: z.string().trim().min(1).max(80),
});

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
