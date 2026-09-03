import { describe, expect, it } from "vitest";

import {
  APPELLATION_FICHE_LANES,
  loadPeopleAppellations,
} from "../peopleAppellationLoader";
import type { People } from "@/types/afrik";

/**
 * The appellation stage walked 800 fiches through four sequential round trips
 * each — ~3 200 calls in a row, and roughly twenty of the load's seventy-six
 * minutes. Each fiche is independent, so the only thing the loop shared was
 * its turn.
 *
 * Everything below drives the real loader against a recording client, which is
 * what makes the concurrency claims meaningful: a mock that resolves instantly
 * would prove neither the lane ceiling nor the lock ordering.
 */

interface Call {
  table: string;
  rows: unknown;
}

function ficheWith(id: string, sourceTitles: string[]): People {
  return {
    id,
    nameMain: id,
    languageFamilyId: "FLG_TEST",
    currentCountries: [],
    content: {
      appellations: {
        selfAppellation: `${id} autonym`,
        exonyms: [`${id} exonym`],
      },
      sources: sourceTitles.map((title) => ({
        title,
        url: `https://example.org/${encodeURIComponent(title)}`,
        tier: "referenced" as const,
      })),
    },
  } as unknown as People;
}

/**
 * A client that records what it was asked to write, reports how many calls were
 * in flight at once, and answers with plausible ids.
 */
function recordingClient() {
  const calls: Call[] = [];
  let inFlight = 0;
  let peakInFlight = 0;

  const builder = (table: string) => {
    const respond = async (rows: unknown) => {
      inFlight += 1;
      peakInFlight = Math.max(peakInFlight, inFlight);
      await new Promise((settle) => setTimeout(settle, 2));
      inFlight -= 1;
      calls.push({ table, rows });

      const list = Array.isArray(rows) ? rows : [rows];
      return {
        data: list.map((row, index) => ({
          id: `${table}-${calls.length}-${index}`,
          field_path: (row as { field_path?: string })?.field_path ?? null,
        })),
        error: null,
      };
    };

    const chain = {
      upsert: (rows: unknown) => ({
        select: () => respond(rows),
        then: (resolve: (value: unknown) => unknown) =>
          respond(rows).then(resolve),
      }),
      insert: (rows: unknown) => ({
        select: () => ({ single: () => respond(rows) }),
        then: (resolve: (value: unknown) => unknown) =>
          respond(rows).then(resolve),
      }),
      select: () => chain,
      eq: () => chain,
      in: () => chain,
      order: () => chain,
      limit: () => chain,
      maybeSingle: async () => ({ data: null, error: null }),
      single: async () => ({ data: null, error: null }),
      then: (resolve: (value: unknown) => unknown) =>
        Promise.resolve({ data: [], error: null }).then(resolve),
    };
    return chain;
  };

  return {
    client: { from: builder } as never,
    calls,
    peak: () => peakInFlight,
  };
}

describe("loadPeopleAppellations", () => {
  // The point of the change, and the guard on it: 800 fiches at once would open
  // 800 concurrent Postgres sessions and trade one bottleneck for another.
  // @req REQ-057
  it("keeps no more fiches in flight than the declared lane count", async () => {
    const { client, peak } = recordingClient();
    const fiches = Array.from({ length: 40 }, (_, i) =>
      ficheWith(`PPL_${i}`, ["Shared atlas"])
    );

    await loadPeopleAppellations(client, fiches);

    expect(peak()).toBeLessThanOrEqual(APPELLATION_FICHE_LANES);
    expect(peak()).toBeGreaterThan(1);
  });

  // Concurrency turns a shared `sources` upsert into a lock-ordering problem:
  // two fiches citing the same two sources in opposite order can deadlock in
  // Postgres. Sorting by title gives every fiche the same acquisition order.
  // @req REQ-057
  it("upserts a fiche's sources in a stable order whatever order the fiche lists them", async () => {
    const { client, calls } = recordingClient();

    await loadPeopleAppellations(client, [
      ficheWith("PPL_FORWARD", ["Alpha atlas", "Zeta atlas"]),
    ]);
    await loadPeopleAppellations(client, [
      ficheWith("PPL_REVERSE", ["Zeta atlas", "Alpha atlas"]),
    ]);

    const sourceTitles = calls
      .filter(({ table }) => table === "sources")
      .map(({ rows }) =>
        (rows as Array<{ title: string }>).map(({ title }) => title)
      );

    expect(sourceTitles).toHaveLength(2);
    expect(sourceTitles[0]).toEqual(["Alpha atlas", "Zeta atlas"]);
    expect(sourceTitles[1]).toEqual(["Alpha atlas", "Zeta atlas"]);
  });

  // Parallel lanes finish in whatever order the database answers. The report is
  // read by a curator and diffed between runs, so it must not reorder itself.
  // @req REQ-057
  it("reports defects in fiche order, not in completion order", async () => {
    const { client } = recordingClient();
    const fiches = ["PPL_CHARLIE", "PPL_ALPHA", "PPL_BRAVO"].map((id) =>
      ficheWith(id, [])
    );

    const report = await loadPeopleAppellations(client, fiches);

    expect(report.errors).toEqual([
      "PPL_ALPHA: fiche declares no source",
      "PPL_BRAVO: fiche declares no source",
      "PPL_CHARLIE: fiche declares no source",
    ]);
  });
});
