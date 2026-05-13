#!/usr/bin/env tsx
/**
 * Source-URL health checker (Story 0.20 / FR31).
 *
 * Probes every `sources.url` in Supabase with a HEAD request and appends one
 * NDJSON record per probe to `dataset/source-url-health.log`. The output is
 * consumed by `scripts/recomputeConfidence.ts` later in the nightly job.
 *
 * Conventions:
 *  - Uses `createAdminClient()` so RLS does not hide any source.
 *  - Uses the structured `logger` from `@/lib/api/logger` (no console.error).
 *  - No new npm dependencies — relies on Node's built-in `fetch` and `fs`.
 *  - Concurrency capped at 10 simultaneous probes (see `CONCURRENCY`).
 *  - HEAD request with 10s timeout, one retry on 5xx, no redirects followed.
 *
 * Local DRY-RUN: when Supabase env vars are missing, the script prints a
 * clear "DRY RUN" log and exits 0 without touching the network or the log.
 */

import * as fs from "fs";
import * as path from "path";
import { createAdminClient } from "../src/lib/supabase/admin";
import { logger } from "../src/lib/api/logger";
import {
  formatHealthRecord,
  promisePool,
  type HealthRecordOut,
} from "./lib/urlHealth";

const CONCURRENCY = 10;
const HEAD_TIMEOUT_MS = 10_000;
const LOG_PATH = path.resolve(
  __dirname,
  "..",
  "dataset",
  "source-url-health.log"
);

interface SourceRow {
  id: string;
  url: string | null;
}

/** One probe of a single URL. Returns the result as an NDJSON-ready record. */
async function probeOnce(url: string): Promise<{
  status: "ok" | "broken";
  http_code: number;
}> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEAD_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "manual",
      signal: controller.signal,
    });
    // Any 2xx or 3xx is considered reachable. 4xx is reachable too (server
    // responded). Only 5xx and network failures count as "broken".
    if (res.status >= 500) {
      return { status: "broken", http_code: res.status };
    }
    return { status: "ok", http_code: res.status };
  } catch {
    return { status: "broken", http_code: 0 };
  } finally {
    clearTimeout(timer);
  }
}

/** Probe with one retry on 5xx / network error. */
async function probe(url: string): Promise<{
  status: "ok" | "broken";
  http_code: number;
}> {
  const first = await probeOnce(url);
  if (first.status === "ok") return first;
  // Retry once.
  const second = await probeOnce(url);
  return second;
}

async function main(): Promise<void> {
  const startedAt = Date.now();

  // DRY-RUN guard — useful for local runs without Supabase env vars.
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    logger.warn(
      "DRY RUN: Supabase env vars missing — skipping source-URL health check",
      { script: "checkSourceUrls" }
    );
    return;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("sources")
    .select("id, url")
    .not("url", "is", null);

  if (error) {
    logger.error("Failed to fetch sources", error, {
      script: "checkSourceUrls",
    });
    process.exit(1);
  }

  const sources: SourceRow[] = (data || []).filter(
    (s: SourceRow) => typeof s.url === "string" && s.url.length > 0
  );
  logger.info(`Probing ${sources.length} source URLs`, {
    script: "checkSourceUrls",
    concurrency: CONCURRENCY,
  });

  // Ensure the dataset/ directory exists.
  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
  const out = fs.createWriteStream(LOG_PATH, { flags: "a" });

  let ok = 0;
  let broken = 0;
  await promisePool(sources, CONCURRENCY, async (src) => {
    const url = src.url as string;
    const { status, http_code } = await probe(url);
    const rec: HealthRecordOut = {
      url,
      status,
      http_code,
      timestamp: new Date().toISOString(),
      source_id: src.id,
    };
    out.write(formatHealthRecord(rec));
    if (status === "ok") ok += 1;
    else broken += 1;
  });

  await new Promise<void>((resolve, reject) => {
    out.end((err?: Error | null) => (err ? reject(err) : resolve()));
  });

  const durationMs = Date.now() - startedAt;
  logger.info("Source-URL health check completed", {
    script: "checkSourceUrls",
    total: sources.length,
    ok,
    broken,
    duration_ms: durationMs,
    log_path: LOG_PATH,
  });
}

main().catch((err) => {
  logger.error("checkSourceUrls crashed", err, { script: "checkSourceUrls" });
  process.exit(1);
});
