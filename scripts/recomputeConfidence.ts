#!/usr/bin/env tsx
/**
 * Confidence recompute job (Story 0.20 / FR31).
 *
 * Reads `dataset/source-url-health.log` (NDJSON, produced by
 * `scripts/checkSourceUrls.ts`) and:
 *
 *  - For each source whose most-recent consecutive-broken run is >= 7 days
 *    AND that does not already have an open auto `unreachable_source` flag
 *    for the related entity: opens a public flag (severity=medium,
 *    auto_generated=true, status=pending) and lowers each related
 *    `confidence_scores.score` by 0.2 (floor 0). Methodology is tagged with
 *    ` [auto-penalty:unreachable_source]` so the penalty is idempotent.
 *
 *  - For each source whose most-recent consecutive-ok run is >= 3 days AND
 *    that has an open auto flag: marks the flag resolved and reverses the
 *    penalty (+0.2, capped at 1.0), stripping the methodology tag.
 *
 * Emits a structured summary at the end:
 *   { fiches_penalized, fiches_recovered, flags_opened, flags_closed }.
 *
 * Local DRY-RUN: when Supabase env vars are missing, the script logs a DRY
 * RUN notice and exits 0 — useful for the unit-test / lint pass.
 *
 * Target runtime: under 2 minutes against the current dataset (~924 PPL).
 */

import * as fs from "fs";
import * as path from "path";
import { createAdminClient } from "../src/lib/supabase/admin";
import { logger } from "../src/lib/api/logger";
import {
  computeConsecutiveRuns,
  decideAction,
  FLAG_TYPE,
  METHODOLOGY_TAG,
  PENALTY_DELTA,
  type HealthRecord,
} from "./lib/urlHealth";

const LOG_PATH = path.resolve(
  __dirname,
  "..",
  "dataset",
  "source-url-health.log"
);

interface AssertionRow {
  id: string;
  entity_type: string;
  entity_id: string;
  source_id: string;
}

interface ConfidenceRow {
  id: string;
  assertion_id: string;
  score: number;
  methodology: string | null;
}

interface FlagRow {
  id: string;
  entity_type: string;
  entity_id: string;
  flag_type: string;
  status: string;
  auto_generated: boolean | null;
}

/** Read and parse the NDJSON log. Missing file = no records. */
function loadHealthRecords(filePath: string): HealthRecord[] {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, "utf-8");
  const out: HealthRecord[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const obj = JSON.parse(trimmed);
      if (
        typeof obj.source_id === "string" &&
        (obj.status === "ok" || obj.status === "broken")
      ) {
        out.push(obj as HealthRecord);
      }
    } catch {
      logger.warn("Skipping malformed NDJSON line", { line: trimmed });
    }
  }
  return out;
}

/** Clamp to [0, 1] with 2-decimal precision. */
function clampScore(n: number): number {
  return Math.max(0, Math.min(1, Math.round(n * 100) / 100));
}

async function main(): Promise<void> {
  const startedAt = Date.now();

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    logger.warn(
      "DRY RUN: Supabase env vars missing — skipping confidence recompute",
      { script: "recomputeConfidence" }
    );
    return;
  }

  const records = loadHealthRecords(LOG_PATH);
  if (records.length === 0) {
    logger.warn("No health records found — nothing to do", {
      log_path: LOG_PATH,
    });
    return;
  }

  const runs = computeConsecutiveRuns(records, new Date());
  const supabase = createAdminClient();

  // Pre-fetch the assertions tied to every source we have data for.
  const sourceIds = [...runs.keys()];
  const { data: assertions, error: aErr } = await supabase
    .from("assertions")
    .select("id, entity_type, entity_id, source_id")
    .in("source_id", sourceIds);
  if (aErr) {
    logger.error("Failed to fetch assertions", aErr, {
      script: "recomputeConfidence",
    });
    process.exit(1);
  }

  // Group entities (entity_type, entity_id) by source_id and remember the
  // assertion ids so we can target the right confidence rows.
  const entitiesBySource = new Map<
    string,
    Array<{ entity_type: string; entity_id: string; assertion_id: string }>
  >();
  for (const a of (assertions || []) as AssertionRow[]) {
    const list = entitiesBySource.get(a.source_id) || [];
    list.push({
      entity_type: a.entity_type,
      entity_id: a.entity_id,
      assertion_id: a.id,
    });
    entitiesBySource.set(a.source_id, list);
  }

  let fiches_penalized = 0;
  let fiches_recovered = 0;
  let flags_opened = 0;
  let flags_closed = 0;

  for (const [sourceId, state] of runs.entries()) {
    const entities = entitiesBySource.get(sourceId) || [];
    if (entities.length === 0) continue;

    // Dedupe entities (a source may back multiple assertions on the same
    // entity); we open at most one flag per entity per source.
    const uniqEntities = new Map<
      string,
      { entity_type: string; entity_id: string; assertion_ids: string[] }
    >();
    for (const e of entities) {
      const key = `${e.entity_type}:${e.entity_id}`;
      const cur = uniqEntities.get(key);
      if (cur) {
        cur.assertion_ids.push(e.assertion_id);
      } else {
        uniqEntities.set(key, {
          entity_type: e.entity_type,
          entity_id: e.entity_id,
          assertion_ids: [e.assertion_id],
        });
      }
    }

    for (const entity of uniqEntities.values()) {
      // Check whether an auto unreachable_source flag is currently open for
      // this entity. Idempotency hinges on this check.
      const { data: openFlags, error: fErr } = await supabase
        .from("flags")
        .select("id, entity_type, entity_id, flag_type, status, auto_generated")
        .eq("entity_type", entity.entity_type)
        .eq("entity_id", entity.entity_id)
        .eq("flag_type", FLAG_TYPE)
        .eq("auto_generated", true)
        .in("status", ["pending", "reviewed"]);
      if (fErr) {
        logger.error("Failed to query flags", fErr, {
          entity_type: entity.entity_type,
          entity_id: entity.entity_id,
        });
        continue;
      }
      const hasOpenFlag = (openFlags || []).length > 0;

      const action = decideAction({ ...state, hasOpenFlag });
      if (action === "noop") continue;

      if (action === "penalize") {
        // 1. Open a public auto flag.
        const { error: insErr } = await supabase.from("flags").insert({
          entity_type: entity.entity_type,
          entity_id: entity.entity_id,
          flag_type: FLAG_TYPE,
          severity: "medium",
          auto_generated: true,
          status: "pending",
          description:
            "Source URL unreachable for >= 7 consecutive days (auto-detected).",
        });
        if (insErr) {
          logger.error("Failed to insert flag", insErr, {
            entity_type: entity.entity_type,
            entity_id: entity.entity_id,
          });
          continue;
        }
        flags_opened += 1;
        fiches_penalized += 1;

        // 2. Reduce each related confidence score by PENALTY_DELTA.
        const { data: scores, error: sErr } = await supabase
          .from("confidence_scores")
          .select("id, assertion_id, score, methodology")
          .in("assertion_id", entity.assertion_ids);
        if (sErr) {
          logger.error("Failed to load confidence rows", sErr, {
            entity_id: entity.entity_id,
          });
          continue;
        }
        for (const row of (scores || []) as ConfidenceRow[]) {
          const methodology = row.methodology || "";
          // Idempotency safeguard: skip if already tagged.
          if (methodology.includes(METHODOLOGY_TAG)) continue;
          const newScore = clampScore(Number(row.score) - PENALTY_DELTA);
          const newMethodology = (methodology + METHODOLOGY_TAG).trim();
          const { error: uErr } = await supabase
            .from("confidence_scores")
            .update({ score: newScore, methodology: newMethodology })
            .eq("id", row.id);
          if (uErr) {
            logger.error("Failed to update confidence row", uErr, {
              confidence_id: row.id,
            });
          }
        }
      } else if (action === "recover") {
        // 1. Resolve the open auto flag(s).
        const flagIds = (openFlags || []).map((f: FlagRow) => f.id);
        if (flagIds.length > 0) {
          const { error: rErr } = await supabase
            .from("flags")
            .update({
              status: "resolved",
              resolved_at: new Date().toISOString(),
            })
            .in("id", flagIds);
          if (rErr) {
            logger.error("Failed to resolve flag(s)", rErr, { flagIds });
            continue;
          }
          flags_closed += flagIds.length;
        }
        fiches_recovered += 1;

        // 2. Reverse the penalty on each related confidence row.
        const { data: scores, error: sErr } = await supabase
          .from("confidence_scores")
          .select("id, assertion_id, score, methodology")
          .in("assertion_id", entity.assertion_ids);
        if (sErr) {
          logger.error("Failed to load confidence rows for recovery", sErr, {
            entity_id: entity.entity_id,
          });
          continue;
        }
        for (const row of (scores || []) as ConfidenceRow[]) {
          const methodology = row.methodology || "";
          if (!methodology.includes(METHODOLOGY_TAG)) continue;
          const newScore = clampScore(Number(row.score) + PENALTY_DELTA);
          const newMethodology = methodology
            .replace(METHODOLOGY_TAG, "")
            .trim();
          const { error: uErr } = await supabase
            .from("confidence_scores")
            .update({
              score: newScore,
              methodology: newMethodology || null,
            })
            .eq("id", row.id);
          if (uErr) {
            logger.error("Failed to update confidence row (recovery)", uErr, {
              confidence_id: row.id,
            });
          }
        }
      }
    }
  }

  const durationMs = Date.now() - startedAt;
  logger.info("Confidence recompute completed", {
    script: "recomputeConfidence",
    fiches_penalized,
    fiches_recovered,
    flags_opened,
    flags_closed,
    duration_ms: durationMs,
  });

  if (durationMs > 120_000) {
    logger.warn("Recompute exceeded 2-minute target", {
      duration_ms: durationMs,
    });
  }
}

main().catch((err) => {
  logger.error("recomputeConfidence crashed", err, {
    script: "recomputeConfidence",
  });
  process.exit(1);
});
