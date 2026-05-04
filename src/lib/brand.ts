/**
 * Brand Constants - Single Source of Truth for Product Branding
 *
 * This module defines all product branding strings used throughout the application.
 * It serves as the single source of truth for branding, making rebranding straightforward.
 *
 * ## Rebrand-Switch Procedure
 *
 * To switch brands, set the following environment variables in your deployment
 * configuration (e.g., `.env.local`, `.env.production`, or your hosting platform):
 *
 * | Environment Variable              | Export             | Default Value                                                         |
 * |-----------------------------------|--------------------|-----------------------------------------------------------------------|
 * | NEXT_PUBLIC_PRODUCT_NAME          | PRODUCT_NAME       | "Atlas des Peuples d'Afrique"                                         |
 * | NEXT_PUBLIC_CANONICAL_DOMAIN      | CANONICAL_DOMAIN   | "ethniafrica.com"                                                     |
 * | NEXT_PUBLIC_ATTRIBUTION_STRING    | ATTRIBUTION_STRING | "Fait avec émotion pour l'Afrique"                                    |
 * | NEXT_PUBLIC_OG_TITLE              | OG_TITLE           | "Atlas des Peuples d'Afrique"                                         |
 * | NEXT_PUBLIC_OG_DESCRIPTION        | OG_DESCRIPTION     | "Encyclopédie des peuples, langues et familles linguistiques d'Afrique" |
 * | NEXT_PUBLIC_SITE_LOCALE           | SITE_LOCALE        | "fr"                                                                  |
 *
 * All environment variables use the `NEXT_PUBLIC_` prefix to ensure they are
 * available in both server and client contexts in Next.js.
 */

/** The main product name displayed throughout the application */
export const PRODUCT_NAME =
  process.env.NEXT_PUBLIC_PRODUCT_NAME || "Atlas des Peuples d'Afrique";

/** The canonical domain for the application (without protocol) */
export const CANONICAL_DOMAIN =
  process.env.NEXT_PUBLIC_CANONICAL_DOMAIN || "ethniafrica.com";

/** Attribution string shown in footers and credits */
export const ATTRIBUTION_STRING =
  process.env.NEXT_PUBLIC_ATTRIBUTION_STRING ||
  "Fait avec émotion pour l'Afrique";

/** Open Graph title for social media previews */
export const OG_TITLE =
  process.env.NEXT_PUBLIC_OG_TITLE || "Atlas des Peuples d'Afrique";

/** Open Graph description for social media previews */
export const OG_DESCRIPTION =
  process.env.NEXT_PUBLIC_OG_DESCRIPTION ||
  "Encyclopédie des peuples, langues et familles linguistiques d'Afrique";

/** Default site locale for i18n */
export const SITE_LOCALE = process.env.NEXT_PUBLIC_SITE_LOCALE || "fr";
