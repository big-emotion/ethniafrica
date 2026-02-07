/**
 * Validation Zod pour les contributions
 */
import { z } from "zod";

export const contributionTypeSchema = z.enum([
  "new_people",
  "update_people",
  "new_country",
  "update_country",
  "new_language_family",
  "update_language_family",
]);

export const contributionSchema = z.object({
  type: contributionTypeSchema,
  proposed_payload: z.record(z.unknown()), // JSONB flexible
  contributor_email: z.preprocess(
    (val) => (val === null || val === "" ? undefined : val),
    z.string().email().optional()
  ),
  contributor_name: z.preprocess(
    (val) => (val === null || val === "" ? undefined : val),
    z.string().min(1).max(200).optional()
  ),
  notes: z.preprocess(
    (val) => (val === null || val === "" ? undefined : val),
    z.string().max(2000).optional()
  ),
  honeypot: z.string().optional(), // Anti-spam field (should be empty)
});

export type ContributionInput = z.infer<typeof contributionSchema>;
