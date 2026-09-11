/**
 * Scale-ladder wallpaper route — one rung, one canvas, one image.
 *
 * Sits beside the quiz-score card rather than under `/v2`: the response
 * envelope does not apply to images, and this reuses that route's font
 * subsets and its `ImageResponse` shape (AR30).
 *
 * **The composition is written once and scaled.** `typeScaleFor` derives every
 * size from the canvas's shorter side, so a 2560-wide desktop wallpaper and a
 * 1080-wide square post are the same design rather than two that have to be
 * kept in step by hand.
 *
 * **The sentence on the image is the sentence on the page.** Both read the
 * same rung out of `scaleLadder`, so a wallpaper cannot drift into carrying a
 * claim the page no longer sources. A rung the corpus does not itself carry
 * prints its provenance on the image, for the same reason the page shows it:
 * a sourced neighbour must not be allowed to vouch for it.
 */
import fs from "node:fs";
import path from "node:path";
import { ImageResponse } from "next/og";

import { CANONICAL_DOMAIN } from "@/lib/brand";
import { findRung } from "@/lib/i18n/copy/scaleLadder";
import { isLocale } from "@/lib/locale";
import { findFormat, typeScaleFor } from "@/lib/wallpaper/formats";
import type { Language } from "@/types/shared";

// @req REQ-132
export const runtime = "nodejs";

const PARCHMENT = "#fbf7f2";
const INK = "#2c2018";
const ACCENT = "#b64e27";

function readFontFile(fileName: string): Buffer {
  return fs.readFileSync(
    path.join(process.cwd(), "src/app/[lang]/comparer/_fonts", fileName)
  );
}

// @req REQ-132
// @req REQ-145
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;

  const language: Language = isLocale(query.get("lang") ?? "")
    ? (query.get("lang") as Language)
    : "fr";
  const rung = findRung(language, query.get("rung") ?? "");
  const format = findFormat(query.get("format") ?? "");

  // An unknown rung or canvas gets nothing rather than a plausible-looking
  // card: the image carries the site's own type, so a stranger must not be
  // able to compose one from the query string.
  if (!rung || !format) {
    return new Response(null, { status: 404 });
  }

  const scale = typeScaleFor(format);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: PARCHMENT,
        color: INK,
        padding: `${scale.padding}px`,
      }}
    >
      <div
        style={{
          display: "flex",
          fontFamily: "Nunito Sans",
          fontSize: scale.footer,
          letterSpacing: scale.footer * 0.12,
          textTransform: "uppercase",
          opacity: 0.65,
        }}
      >
        {rung.subject}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: scale.anchor * 0.9,
        }}
      >
        <div
          style={{
            display: "flex",
            fontFamily: "Fraunces",
            fontSize: scale.magnitude,
            fontWeight: 600,
            lineHeight: 1,
          }}
        >
          {rung.magnitude}
        </div>
        <div
          style={{
            display: "flex",
            width: scale.magnitude * 0.9,
            height: Math.max(2, Math.round(scale.footer * 0.16)),
            background: ACCENT,
          }}
        />
        <div
          style={{
            display: "flex",
            fontFamily: "Nunito Sans",
            fontSize: scale.anchor,
            lineHeight: 1.45,
            maxWidth: format.width - scale.padding * 2,
          }}
        >
          {rung.anchor}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: scale.footer * 0.4,
          fontFamily: "Nunito Sans",
          fontSize: scale.footer,
          opacity: 0.7,
        }}
      >
        <div style={{ display: "flex" }}>{rung.provenance}</div>
        <div style={{ display: "flex", color: ACCENT, opacity: 0.9 }}>
          {CANONICAL_DOMAIN}
        </div>
      </div>
    </div>,
    {
      width: format.width,
      height: format.height,
      fonts: [
        {
          name: "Fraunces",
          data: readFontFile("Fraunces-600-subset.ttf"),
          weight: 600,
          style: "normal",
        },
        {
          name: "Nunito Sans",
          data: readFontFile("NunitoSans-400-subset.ttf"),
          weight: 400,
          style: "normal",
        },
      ],
      headers: {
        "Cache-Control": "public, max-age=86400",
        "Content-Disposition": `attachment; filename="ethniafrica-${rung.id}-${format.id}.png"`,
      },
    }
  );
}
