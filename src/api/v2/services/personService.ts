/**
 * Person Service — data-access layer for the ARCH-018 person entity.
 *
 * Foundation only (ETNI-1382/ETNI-1587): no API route, handler or OpenAPI
 * spec yet — those belong to a downstream "expose person endpoint" ticket.
 */

import { getPersonById as getPersonByIdQuery } from "@/lib/supabase/queries/afrik/persons";
import type { Person } from "@/types/persons";

/**
 * Get a single person by PER_ id, with role category, people join
 * (membership/observation label), country join and tiered sources.
 */
// @req REQ-137
export async function getPersonById(id: string): Promise<Person | null> {
  return await getPersonByIdQuery(id);
}
