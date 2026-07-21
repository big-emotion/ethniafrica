import { z } from "zod";

export const revalidatePayloadSchema = z.object({
  entity_type: z.string().min(1),
  entity_id: z.string().min(1),
  slug: z.string().min(1),
});

export type RevalidatePayload = z.infer<typeof revalidatePayloadSchema>;
