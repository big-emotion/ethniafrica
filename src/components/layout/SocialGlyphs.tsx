/**
 * The three network marks, drawn here rather than imported.
 *
 * lucide-react shipped `Facebook`, `Linkedin` and `Instagram` until v1, which
 * dropped every brand icon — the package this repo is on exports none of
 * them. Pulling a second icon library for three glyphs would put two stroke
 * systems in the same footer, so the geometry lucide used is kept and drawn
 * with the same 24-unit box, 2-unit stroke and round joins as every other
 * icon on the page.
 *
 * They are marks, never labels: each one is `aria-hidden`, and the element
 * around it carries the network's name.
 */

interface SocialGlyphProps {
  className?: string;
}

const GLYPH_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

// @req REQ-046
export function FacebookGlyph({ className }: SocialGlyphProps) {
  return (
    <svg {...GLYPH_PROPS} className={className}>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

// @req REQ-046
export function LinkedinGlyph({ className }: SocialGlyphProps) {
  return (
    <svg {...GLYPH_PROPS} className={className}>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

// @req REQ-046
export function InstagramGlyph({ className }: SocialGlyphProps) {
  return (
    <svg {...GLYPH_PROPS} className={className}>
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}
