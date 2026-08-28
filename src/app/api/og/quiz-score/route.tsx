/**
 * Quiz score Open Graph image route — `next/og` `ImageResponse` (Epic 10,
 * Story 10.10, ETNI-499, ETNI-1141, FR70). Lives outside `/v2` on purpose:
 * the AR8 response-envelope does not apply to images. Decorative only — the
 * score page itself renders the full text-first equivalent. Params are
 * validated through the same shared Zod schema as the score page
 * (scoreCardParams.ts) so forged/absurd cards 404 here too (dignity rule).
 * Reuses Epic 9's font subsets and the single OG pattern established by
 * src/app/[lang]/comparer/[entityType]/opengraph-image/route.tsx (AR30).
 */
import fs from "node:fs";
import path from "node:path";
import { ImageResponse } from "next/og";
import { parseScoreCardParams } from "@/lib/quiz/scoreCardParams";
import { translations } from "@/lib/translations";
import { CANONICAL_DOMAIN } from "@/lib/brand";

const t = translations.fr.quiz;

// @req REQ-103 FR70
export const runtime = "nodejs";

const IMAGE_SIZE = { width: 1200, height: 630 };

function readFontFile(fileName: string): Buffer {
  return fs.readFileSync(
    path.join(process.cwd(), "src/app/[lang]/comparer/_fonts", fileName)
  );
}

// @req REQ-103 FR70
export async function GET(request: Request) {
  const params = parseScoreCardParams(new URL(request.url).searchParams);

  if (!params) {
    return new Response(null, { status: 404 });
  }

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#fbf7f2",
        color: "#2c2018",
        padding: "56px",
      }}
    >
      <div
        style={{
          display: "flex",
          fontFamily: "Nunito Sans",
          fontSize: 24,
          opacity: 0.75,
        }}
      >
        {t.segments[params.segment]}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div
          style={{
            display: "flex",
            fontFamily: "Fraunces",
            fontSize: 96,
            fontWeight: 600,
          }}
        >
          {params.correct} / {params.total}
        </div>
        <div
          style={{
            display: "flex",
            fontFamily: "Nunito Sans",
            fontSize: 28,
            color: "#b64e27",
          }}
        >
          {t.ogSourcedLine}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          fontFamily: "Nunito Sans",
          fontSize: 20,
          opacity: 0.7,
        }}
      >
        {CANONICAL_DOMAIN}
      </div>
    </div>,
    {
      ...IMAGE_SIZE,
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
      },
    }
  );
}
