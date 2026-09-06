/**
 * Validation utilities for API v2
 */

import { mediaSchema, type MediaInput } from "@/api/v2/schemas/media";
import type { TranslationLocale } from "@/lib/i18n/translationLocale";

/**
 * Validate and parse page parameter
 */
// @req REQ-110
export function validatePage(page?: string | null): number {
  if (!page) return 1;
  const parsed = parseInt(page, 10);
  return isNaN(parsed) || parsed < 1 ? 1 : parsed;
}

/**
 * Validate and parse perPage parameter
 */
// @req REQ-110
export function validatePerPage(
  perPage?: string | null,
  max: number = 100
): number {
  if (!perPage) return 20;
  const parsed = parseInt(perPage, 10);
  if (isNaN(parsed) || parsed < 1) return 20;
  return parsed > max ? max : parsed;
}

/**
 * Validate ISO country code (3 letters)
 */
// @req REQ-084
export function validateCountryId(id: string): boolean {
  return /^[A-Z]{3}$/.test(id);
}

/**
 * Validate FLG_ language family ID
 */
// @req REQ-084
export function validateLanguageFamilyId(id: string): boolean {
  return /^FLG_[A-Z_]+$/.test(id);
}

/**
 * Validate PPL_ people ID
 */
// @req REQ-084
export function validatePeopleId(id: string): boolean {
  return /^PPL_[A-Z_]+$/.test(id);
}

/**
 * The locale a single-entity read is asked for. Absent means the authored
 * French; anything outside the two published locales is a 400, not a
 * silent fallback — a client asking for `de` must learn it does not exist.
 */
// @req REQ-142
export function validateLang(raw?: string | null): TranslationLocale | null {
  if (raw === undefined || raw === null || raw === "") return "fr";
  return raw === "en" || raw === "fr" ? raw : null;
}

/**
 * Reject invalid media before it reaches the persistence layer.
 */
// @req REQ-128
export function validateMedia(media: unknown): MediaInput {
  return mediaSchema.parse(media);
}
