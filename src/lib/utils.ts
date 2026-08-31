import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * The nine roles of the type scale, as they appear after `text-`.
 *
 * Kept in step with `theme.extend.fontSize` in `tailwind.config.ts` and with
 * `--afh-text-*` in `src/styles/tokens/type.css`;
 * `src/styles/__tests__/typeScaleCharter.test.ts` holds those two together,
 * and `src/lib/__tests__/cnTypeScaleCharter.test.ts` holds this one to them.
 */
const TYPE_SCALE_ROLES = [
  "afh-hero",
  "afh-h1",
  "afh-h2",
  "afh-h3",
  "afh-lead",
  "afh-body",
  "afh-small",
  "afh-caption",
  "afh-eyebrow",
] as const;

/**
 * tailwind-merge reads `text-*` against a closed list of size keys and files
 * everything else under text-colour. The scale's roles are not on that list,
 * so `text-afh-small` was classified as a colour — and `cn("text-afh-small",
 * "text-white")` returned only `text-white`, dropping the size in silence.
 *
 * That is not a hypothetical: `<Button>`'s default variant is `text-white`, so
 * every button in the product was rendering at the inherited size rather than
 * its own, with nothing to show for it but the size itself.
 *
 * Declaring the roles as font-size classes is what makes the two groups
 * distinct again: a role now overrides another role, a colour overrides
 * another colour, and the two no longer see each other. The `afh-*` colour
 * tokens (`text-afh-text`, `text-afh-terracotta`, …) share the prefix but no
 * name with these nine, so nothing is ambiguous.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: [...TYPE_SCALE_ROLES] }],
    },
  },
});

// @req REQ-091
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
