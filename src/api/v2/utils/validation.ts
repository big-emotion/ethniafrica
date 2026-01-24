/**
 * Validation utilities for API v2
 */

/**
 * Validate and parse page parameter
 */
export function validatePage(page?: string | null): number {
  if (!page) return 1;
  const parsed = parseInt(page, 10);
  return isNaN(parsed) || parsed < 1 ? 1 : parsed;
}

/**
 * Validate and parse perPage parameter
 */
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
export function validateCountryId(id: string): boolean {
  return /^[A-Z]{3}$/.test(id);
}

/**
 * Validate FLG_ language family ID
 */
export function validateLanguageFamilyId(id: string): boolean {
  return /^FLG_[A-Z_]+$/.test(id);
}

/**
 * Validate PPL_ people ID
 */
export function validatePeopleId(id: string): boolean {
  return /^PPL_[A-Z_]+$/.test(id);
}
