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
 * | NEXT_PUBLIC_PRODUCT_NAME          | PRODUCT_NAME       | "EthniAfrica"                                                           |
 * | NEXT_PUBLIC_CANONICAL_DOMAIN      | CANONICAL_DOMAIN   | "ethniafrica.com"                                                     |
 * | NEXT_PUBLIC_ATTRIBUTION_STRING    | ATTRIBUTION_STRING | "Fait avec émotion pour l'Afrique"                                    |
 * | NEXT_PUBLIC_OG_TITLE              | OG_TITLE           | "EthniAfrica — Atlas des Peuples d'Afrique"                            |
 * | NEXT_PUBLIC_OG_DESCRIPTION        | OG_DESCRIPTION     | "Encyclopédie des peuples, langues et familles linguistiques d'Afrique" |
 * | NEXT_PUBLIC_SITE_LOCALE           | SITE_LOCALE        | "fr"                                                                  |
 *
 * All environment variables use the `NEXT_PUBLIC_` prefix to ensure they are
 * available in both server and client contexts in Next.js.
 *
 * > **Important — build-time inlining**: Next.js statically replaces
 * > `NEXT_PUBLIC_*` references at **compile time**. This means that after
 * > changing any of these environment variables, **a fresh build is required**
 * > for the new values to take effect. Hot-swapping the env var on a running
 * > server without rebuilding will have no effect.
 */

/** The main product name displayed throughout the application */
// @req REQ-019
export const PRODUCT_NAME =
  process.env.NEXT_PUBLIC_PRODUCT_NAME || "EthniAfrica";

/**
 * What the product is, in one line, beside the name in the masthead.
 *
 * The same qualifier {@link OG_TITLE} carries after the em dash, kept as its
 * own constant because the masthead sets the two halves differently — the name
 * in the display face, the qualifier in the warm gradient — and splitting
 * `OG_TITLE` on a dash at render time would break the day the title is
 * rewritten without one.
 *
 * The one constant here with no `NEXT_PUBLIC_*` override, and deliberately so
 * for now: `checkEnvExample.ts` gates the code and `.env.example` against each
 * other in both directions, so a new variable is only half a change until the
 * example file declares it too. Give it an override the day the example file
 * is edited in the same commit — not before, or the gate goes red for everyone.
 */
// @req REQ-019
export const PRODUCT_TAGLINE = "Atlas des Peuples d'Afrique";

/** The canonical domain for the application (without protocol) */
// @req REQ-019
export const CANONICAL_DOMAIN =
  process.env.NEXT_PUBLIC_CANONICAL_DOMAIN || "ethniafrica.com";

/** Attribution string shown in footers and credits */
// @req REQ-019
export const ATTRIBUTION_STRING =
  process.env.NEXT_PUBLIC_ATTRIBUTION_STRING ||
  "Fait avec émotion pour l'Afrique";

/**
 * The site's own title: the home tab and the social card.
 *
 * The only place the brand is qualified. There it stands alone, with no
 * masthead beside it to say what EthniAfrica is — whereas an inner page
 * suffixes {@link PRODUCT_NAME} to a title that already carries its own
 * qualifier, and would otherwise stack two of them in one tab.
 */
// @req REQ-019
export const OG_TITLE =
  process.env.NEXT_PUBLIC_OG_TITLE ||
  "EthniAfrica — Atlas des Peuples d'Afrique";

/**
 * Open Graph description for social media previews.
 *
 * It names all six corpus classes, and `siteDescription.test.ts` holds it to
 * the registry so a seventh cannot ship without this sentence saying so. The
 * three sentences that describe the product to someone who has not arrived
 * yet named four for as long as the atlas kept growing.
 */
// @req REQ-019
export const OG_DESCRIPTION =
  process.env.NEXT_PUBLIC_OG_DESCRIPTION ||
  "Encyclopédie des peuples, langues, familles linguistiques, pays, appellations et noms d'Afrique";

/** Default site locale for i18n */
// @req REQ-019
export const SITE_LOCALE = process.env.NEXT_PUBLIC_SITE_LOCALE || "fr";
