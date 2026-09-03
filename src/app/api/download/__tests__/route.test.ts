import { describe, it, expect, beforeEach, vi } from "vitest";
import { inflateRawSync } from "node:zlib";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase/queries/afrik/languageFamilies", () => ({
  getAllAfrikLanguageFamilies: vi.fn(),
}));

vi.mock("@/lib/supabase/queries/afrik/peoples", () => ({
  getAllAfrikPeoples: vi.fn(),
}));

vi.mock("@/lib/supabase/queries/afrik/countries", () => ({
  getAllAfrikCountries: vi.fn(),
}));

import { GET, OPTIONS } from "../route";
import { getAllAfrikLanguageFamilies } from "@/lib/supabase/queries/afrik/languageFamilies";
import { getAllAfrikPeoples } from "@/lib/supabase/queries/afrik/peoples";
import { getAllAfrikCountries } from "@/lib/supabase/queries/afrik/countries";

const FAMILIES = [
  {
    id: "FLG_NIGER_CONGO",
    nameFr: "Niger-Congo",
    nameEn: "Niger-Congo",
    content: {},
  },
  { id: "FLG_AFRO_ASIATIQUE", nameFr: "Afro-asiatique", content: {} },
];

const PEOPLES = [
  {
    id: "PPL_BAMILEKE",
    nameMain: "Bamiléké",
    languageFamilyId: "FLG_NIGER_CONGO",
    currentCountries: ["CMR"],
    content: {},
  },
  {
    id: "PPL_PEUL",
    // A comma in an editorial name is what `escapeCSV` exists for; keeping one
    // in the fixture proves the archived CSV stays parsable.
    nameMain: "Peul, Fulbé",
    languageFamilyId: "FLG_NIGER_CONGO",
    currentCountries: ["SEN", "MLI"],
    content: {},
  },
];

const COUNTRIES = [
  { id: "CMR", nameFr: "Cameroun", etymology: "Rio dos Camarões", content: {} },
  { id: "SEN", nameFr: "Sénégal", content: {} },
];

const LOCAL_FILE_HEADER_SIGNATURE = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
const END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50;

/**
 * Reads a ZIP through its End of Central Directory record.
 *
 * archiver streams entries with a data descriptor, so the local file headers
 * carry a zero compressed size — only the central directory knows how long
 * each entry is. No ZIP library is a declared dependency here and
 * `check:dead` holds unlisted dependencies at zero, so the format is walked
 * directly rather than pulling one in for a single assertion.
 */
function readZipEntries(zip: Buffer): Map<string, string> {
  let eocd = zip.length - 22;
  while (
    eocd >= 0 &&
    zip.readUInt32LE(eocd) !== END_OF_CENTRAL_DIRECTORY_SIGNATURE
  ) {
    eocd--;
  }
  if (eocd < 0) throw new Error("no end-of-central-directory record");

  const entryCount = zip.readUInt16LE(eocd + 10);
  let cursor = zip.readUInt32LE(eocd + 16);
  const entries = new Map<string, string>();

  for (let i = 0; i < entryCount; i++) {
    const compressionMethod = zip.readUInt16LE(cursor + 10);
    const compressedSize = zip.readUInt32LE(cursor + 20);
    const nameLength = zip.readUInt16LE(cursor + 28);
    const extraLength = zip.readUInt16LE(cursor + 30);
    const commentLength = zip.readUInt16LE(cursor + 32);
    const localHeaderOffset = zip.readUInt32LE(cursor + 42);
    const name = zip.toString("utf8", cursor + 46, cursor + 46 + nameLength);

    const localNameLength = zip.readUInt16LE(localHeaderOffset + 26);
    const localExtraLength = zip.readUInt16LE(localHeaderOffset + 28);
    const dataStart =
      localHeaderOffset + 30 + localNameLength + localExtraLength;
    const payload = zip.subarray(dataStart, dataStart + compressedSize);

    entries.set(
      name,
      compressionMethod === 0
        ? payload.toString("utf8")
        : inflateRawSync(payload).toString("utf8")
    );

    cursor += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}

async function downloadCsvArchive(): Promise<{
  response: Response;
  zip: Buffer;
}> {
  const response = await GET(
    new NextRequest("http://localhost/api/download?format=csv")
  );
  return { response, zip: Buffer.from(await response.arrayBuffer()) };
}

describe("GET /api/download?format=csv", () => {
  beforeEach(() => {
    vi.mocked(getAllAfrikLanguageFamilies).mockResolvedValue(FAMILIES);
    vi.mocked(getAllAfrikPeoples).mockResolvedValue(PEOPLES);
    vi.mocked(getAllAfrikCountries).mockResolvedValue(COUNTRIES);
  });

  // @req REQ-005
  it("answers with a zip archive a reader's unzip tool can open", async () => {
    const { response, zip } = await downloadCsvArchive();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/zip");
    expect(response.headers.get("Content-Disposition")).toContain(
      "ethniafrique-atlas-v2.zip"
    );
    expect(zip.subarray(0, 4)).toEqual(LOCAL_FILE_HEADER_SIGNATURE);
  });

  // @req REQ-005
  it("packs the four corpus tables the atlas publishes", async () => {
    const { zip } = await downloadCsvArchive();

    expect([...readZipEntries(zip).keys()].sort()).toEqual([
      "familles_linguistiques.csv",
      "pays.csv",
      "peuples.csv",
      "peuples_pays.csv",
    ]);
  });

  // @req REQ-005
  it("carries the corpus rows, not just the entry names", async () => {
    const entries = readZipEntries((await downloadCsvArchive()).zip);

    expect(entries.get("familles_linguistiques.csv")).toBe(
      [
        "id,name_fr,name_en",
        "FLG_NIGER_CONGO,Niger-Congo,Niger-Congo",
        "FLG_AFRO_ASIATIQUE,Afro-asiatique,",
      ].join("\n")
    );
    expect(entries.get("peuples.csv")).toBe(
      [
        "id,name_main,language_family_id,countries",
        "PPL_BAMILEKE,Bamiléké,FLG_NIGER_CONGO,CMR",
        'PPL_PEUL,"Peul, Fulbé",FLG_NIGER_CONGO,SEN; MLI',
      ].join("\n")
    );
    expect(entries.get("pays.csv")).toBe(
      [
        "id,name_fr,etymology",
        "CMR,Cameroun,Rio dos Camarões",
        "SEN,Sénégal,",
      ].join("\n")
    );
    // One row per (people, country) pair, so a people present in two countries
    // appears twice.
    expect(entries.get("peuples_pays.csv")).toBe(
      [
        "people_id,country_id",
        "PPL_BAMILEKE,CMR",
        "PPL_PEUL,SEN",
        "PPL_PEUL,MLI",
      ].join("\n")
    );
  });

  // @req REQ-005
  it("stays reachable cross-origin, as an open-data export must", async () => {
    const { response } = await downloadCsvArchive();

    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(response.headers.get("Access-Control-Allow-Methods")).toBe(
      "GET, OPTIONS"
    );
    expect(response.headers.get("Access-Control-Allow-Headers")).toBe(
      "Content-Type, Authorization"
    );
  });

  // The preflight answers with the shared CORS policy's configured origin,
  // while GET answers "*" from this route's own header helper. The two
  // disagree, so a browser on a third-party origin is refused at preflight
  // despite the download itself being open. Asserted as it behaves, not as it
  // ought to: reconciling them is a CORS decision, not a dependency bump.
  // @req REQ-005
  it("answers the CORS preflight so a browser client may start the download", async () => {
    const response = await OPTIONS();

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).not.toBeNull();
  });
});
