/**
 * Light tests for the source-URL checker helpers.
 *
 * Verifies:
 *   - NDJSON line schema (one JSON object per line, with the expected fields)
 *   - The concurrency-pool helper respects its cap.
 */

import { describe, it, expect } from "vitest";
import {
  formatHealthRecord,
  promisePool,
  type HealthRecordOut,
} from "../lib/urlHealth";

describe("formatHealthRecord", () => {
  it("produces a single-line JSON string with the expected fields", () => {
    const rec: HealthRecordOut = {
      url: "https://example.com",
      status: "ok",
      http_code: 200,
      timestamp: "2026-05-13T02:17:00.000Z",
      source_id: "11111111-2222-3333-4444-555555555555",
    };
    const line = formatHealthRecord(rec);
    expect(line.endsWith("\n")).toBe(true);
    expect(line.includes("\n", 0)).toBe(true);
    // Stripping the trailing newline yields a parseable JSON object.
    const parsed = JSON.parse(line.trimEnd());
    expect(parsed).toEqual(rec);
    expect(typeof parsed.url).toBe("string");
    expect(["ok", "broken"]).toContain(parsed.status);
    expect(typeof parsed.http_code).toBe("number");
    expect(typeof parsed.timestamp).toBe("string");
    expect(typeof parsed.source_id).toBe("string");
  });

  it("represents 'broken' status with http_code=0 when no response", () => {
    const rec: HealthRecordOut = {
      url: "https://broken.example.com",
      status: "broken",
      http_code: 0,
      timestamp: "2026-05-13T02:17:00.000Z",
      source_id: "00000000-0000-0000-0000-000000000000",
    };
    const parsed = JSON.parse(formatHealthRecord(rec).trimEnd());
    expect(parsed.status).toBe("broken");
    expect(parsed.http_code).toBe(0);
  });
});

describe("promisePool", () => {
  it("never exceeds the concurrency cap", async () => {
    const cap = 3;
    let inFlight = 0;
    let maxObserved = 0;
    const work = Array.from({ length: 12 }, (_, i) => i);

    await promisePool(work, cap, async () => {
      inFlight += 1;
      maxObserved = Math.max(maxObserved, inFlight);
      // Yield to the microtask queue so concurrent tasks can interleave.
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;
    });

    expect(maxObserved).toBeLessThanOrEqual(cap);
    expect(maxObserved).toBeGreaterThan(0);
  });

  it("processes every item exactly once", async () => {
    const items = ["a", "b", "c", "d", "e"];
    const seen: string[] = [];
    await promisePool(items, 2, async (item) => {
      seen.push(item);
    });
    expect(seen.sort()).toEqual([...items].sort());
  });

  it("resolves immediately when the input list is empty", async () => {
    await expect(promisePool([], 4, async () => {})).resolves.toBeUndefined();
  });
});
