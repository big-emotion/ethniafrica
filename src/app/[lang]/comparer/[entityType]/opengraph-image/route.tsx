/**
 * Dynamic comparison OG image route — `next/og` `ImageResponse` (FR63, AR30).
 *
 * Same URL-reconstructs-the-comparison contract as page.tsx, but fetches
 * through `comparisonService.getComparisonEntities` instead of
 * `assembleComparison` because this route also needs the batched Module #0
 * confidence read (`assembleComparison` does not fetch confidence).
 */
import fs from "node:fs";
import path from "node:path";
import { ImageResponse } from "next/og";
import { getComparisonEntities } from "@/api/v2/services/comparisonService";
import { transformComparisonData } from "@/lib/comparisonDataTransformer";
import { buildComparisonOgCard } from "@/lib/comparisonOgCard";
import { CANONICAL_DOMAIN } from "@/lib/brand";
import type { CompareEntityType } from "@/types/compare";

// @req REQ-097
export const runtime = "nodejs";

interface RouteParams {
  lang: string;
  entityType: string;
}

const IMAGE_SIZE = { width: 1200, height: 630 };

const ENTITY_TYPE_SLUGS = ["peuples", "pays", "familles"] as const;
type ComparerEntityTypeSlug = (typeof ENTITY_TYPE_SLUGS)[number];

const SLUG_TO_INTERNAL_TYPE: Record<ComparerEntityTypeSlug, CompareEntityType> =
  {
    peuples: "peuple",
    pays: "pays",
    familles: "famille",
  };

function isComparerEntityTypeSlug(
  value: string
): value is ComparerEntityTypeSlug {
  return (ENTITY_TYPE_SLUGS as readonly string[]).includes(value);
}

function hasValidSegmentShape(
  entityType: string,
  ids: string[]
): entityType is ComparerEntityTypeSlug {
  if (!isComparerEntityTypeSlug(entityType)) return false;
  if (ids.length < 2 || ids.length > 3) return false;
  return new Set(ids).size === ids.length;
}

function readFontFile(fileName: string): Buffer {
  return fs.readFileSync(
    path.join(process.cwd(), "src/app/[lang]/comparer/_fonts", fileName)
  );
}

// @req REQ-097
export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<RouteParams>;
  }
) {
  const { entityType } = await params;
  const ids = new URL(request.url).searchParams.getAll("id");

  if (!hasValidSegmentShape(entityType, ids)) {
    return new Response(null, { status: 404 });
  }

  const internalType = SLUG_TO_INTERNAL_TYPE[entityType];
  const { entities, missingIds } = await getComparisonEntities(
    internalType,
    ids
  );

  if (missingIds.length > 0) {
    return new Response(null, { status: 404 });
  }

  const pageData = transformComparisonData(entities.map((item) => item.entity));
  const confidenceById = new Map(
    entities.map((item) => [item.id, item.confidence])
  );

  const card = buildComparisonOgCard({
    ...pageData,
    columns: pageData.columns.map((column) => {
      const confidence = confidenceById.get(column.id);
      return {
        ...column,
        confidence: confidence
          ? { score: confidence.score, sourceCount: confidence.sourceCount }
          : null,
      };
    }),
  });

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background:
          "linear-gradient(135deg, #0f172a 0%, #1e293b 35%, #111827 100%)",
        color: "white",
        padding: "56px",
      }}
    >
      <div style={{ display: "flex", fontSize: 24, opacity: 0.85 }}>
        {card.entityTypeLabel} · Comparaison
      </div>
      <div style={{ display: "flex", gap: 32, alignItems: "stretch" }}>
        {card.entities.map((entity) => (
          <div
            key={entity.id}
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              gap: 12,
              padding: "24px",
              borderRadius: 16,
              background: "rgba(255, 255, 255, 0.06)",
            }}
          >
            <div
              style={{
                display: "flex",
                fontFamily: "Fraunces",
                fontSize: 40,
                fontWeight: 600,
                lineHeight: 1.15,
              }}
            >
              {entity.autonym}
            </div>
            {entity.exonym ? (
              <div
                style={{
                  display: "flex",
                  fontFamily: "Nunito Sans",
                  fontSize: 22,
                  opacity: 0.75,
                }}
              >
                {entity.exonym}
              </div>
            ) : null}
            <div
              style={{
                display: "flex",
                fontFamily: "Nunito Sans",
                fontSize: 18,
                opacity: 0.65,
              }}
            >
              {entity.confidenceLabel}
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontFamily: "Nunito Sans",
          fontSize: 20,
          opacity: 0.9,
        }}
      >
        <div style={{ display: "flex" }}>{CANONICAL_DOMAIN}</div>
        <div style={{ display: "flex" }}>{card.attribution}</div>
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
