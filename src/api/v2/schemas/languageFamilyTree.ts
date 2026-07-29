/**
 * Zod schema for GET /v2/language-families/{id}/tree (FR48, FR33).
 */

import { z } from "zod";

export const languageFamilyTreeParamSchema = z.object({
  id: z.string().regex(/^FLG_[A-Z_]+$/, {
    message: "Invalid language family id format (expected FLG_*)",
  }),
});

export type LanguageFamilyTreeParam = z.infer<
  typeof languageFamilyTreeParamSchema
>;
