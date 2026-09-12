import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { mapCountryDetail, mapPeopleDetail } from "@/lib/afrikDetailMapper";
import type { CountryDetail, PeopleDetail } from "@/types/afrik-frontend";

/**
 * The corpus as the fiches receive it, read straight from git.
 *
 * The parity work is judged on every record, not on the two the reviewed
 * rendering was drawn from, so the contracts load the JSON the loaders publish
 * and pass it through the same mappers the API uses. A fixture written by hand
 * holds only the shapes its author thought of; the corpus holds the ones that
 * exist — thirteen countries with a typed modern entry, two with no colonial
 * one, eighteen with an undated former name.
 */

const AFRIK = join(process.cwd(), "dataset/source/afrik");

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

function peopleFiles(dir = join(AFRIK, "peuples")): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return peopleFiles(full);
    return /^PPL_.*\.json$/.test(entry.name) ? [full] : [];
  });
}

// @req REQ-091
export function countryRecord(iso3: string): CountryDetail {
  return mapCountryDetail(
    readJson(join(AFRIK, "pays", `${iso3}.json`)) as Parameters<
      typeof mapCountryDetail
    >[0]
  );
}

// @req REQ-091
export function allCountryRecords(): CountryDetail[] {
  return readdirSync(join(AFRIK, "pays"))
    .filter((name) => /^[A-Z]{3}\.json$/.test(name))
    .sort()
    .map((name) => countryRecord(name.slice(0, 3)));
}

// @req REQ-091
export function allPeopleRecords(): PeopleDetail[] {
  return peopleFiles()
    .sort()
    .map((file) =>
      mapPeopleDetail(readJson(file) as Parameters<typeof mapPeopleDetail>[0])
    );
}

// @req REQ-091
export function peopleRecord(id: string): PeopleDetail {
  const file = peopleFiles().find((path) => path.endsWith(`/${id}.json`));
  if (!file) throw new Error(`No people record ${id} in the corpus`);
  return mapPeopleDetail(
    readJson(file) as Parameters<typeof mapPeopleDetail>[0]
  );
}
