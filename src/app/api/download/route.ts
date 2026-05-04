import { NextRequest, NextResponse } from "next/server";
import archiver from "archiver";
import ExcelJS from "exceljs";
import { corsOptionsResponse } from "@/lib/api/cors";
import { getAllAfrikCountries } from "@/lib/supabase/queries/afrik/countries";
import { getAllAfrikPeoples } from "@/lib/supabase/queries/afrik/peoples";
import { getAllAfrikLanguageFamilies } from "@/lib/supabase/queries/afrik/languageFamilies";
import { logger } from "@/lib/api/logger";

function escapeCSV(value: string | string[] | undefined | null): string {
  if (!value) return "";
  if (Array.isArray(value)) {
    return value.join("; ");
  }
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function applyCorsHeaders(response: NextResponse): NextResponse {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  return response;
}

async function generateCSVZip(): Promise<Buffer> {
  const [families, peoples, countries] = await Promise.all([
    getAllAfrikLanguageFamilies(),
    getAllAfrikPeoples(),
    getAllAfrikCountries(),
  ]);

  const archive = archiver("zip", { zlib: { level: 9 } });
  const chunks: Buffer[] = [];

  archive.on("data", (chunk: Buffer) => chunks.push(chunk));

  // familles_linguistiques.csv
  const familiesCSV = [
    "id,name_fr,name_en",
    ...families.map(
      (f) =>
        `${escapeCSV(f.id)},${escapeCSV(f.nameFr)},${escapeCSV(f.nameEn || "")}`
    ),
  ].join("\n");
  archive.append(familiesCSV, { name: "familles_linguistiques.csv" });

  // peuples.csv
  const peoplesCSV = [
    "id,name_main,language_family_id,countries",
    ...peoples.map(
      (p) =>
        `${escapeCSV(p.id)},${escapeCSV(p.nameMain)},${escapeCSV(p.languageFamilyId)},${escapeCSV(p.currentCountries)}`
    ),
  ].join("\n");
  archive.append(peoplesCSV, { name: "peuples.csv" });

  // pays.csv
  const countriesCSV = [
    "id,name_fr,etymology",
    ...countries.map(
      (c) =>
        `${escapeCSV(c.id)},${escapeCSV(c.nameFr)},${escapeCSV(c.etymology || "")}`
    ),
  ].join("\n");
  archive.append(countriesCSV, { name: "pays.csv" });

  // peuples_pays.csv (relation table)
  const relations: string[] = ["people_id,country_id"];
  for (const p of peoples) {
    for (const countryId of p.currentCountries) {
      relations.push(`${escapeCSV(p.id)},${escapeCSV(countryId)}`);
    }
  }
  archive.append(relations.join("\n"), { name: "peuples_pays.csv" });

  archive.finalize();

  await new Promise<void>((resolve, reject) => {
    archive.on("end", () => resolve());
    archive.on("error", (err) => reject(err));
  });

  return Buffer.concat(chunks);
}

async function generateExcel(): Promise<Buffer> {
  const [families, peoples, countries] = await Promise.all([
    getAllAfrikLanguageFamilies(),
    getAllAfrikPeoples(),
    getAllAfrikCountries(),
  ]);

  const workbook = new ExcelJS.Workbook();

  // Résumé
  const summarySheet = workbook.addWorksheet("Résumé");
  summarySheet.addRows([
    ["Familles linguistiques", families.length],
    ["Peuples", peoples.length],
    ["Pays", countries.length],
  ]);

  // Familles
  const familiesSheet = workbook.addWorksheet("Familles");
  familiesSheet.addRow(["ID", "Nom (FR)", "Nom (EN)"]);
  for (const f of families) {
    familiesSheet.addRow([f.id, f.nameFr, f.nameEn || ""]);
  }

  // Peuples
  const peoplesSheet = workbook.addWorksheet("Peuples");
  peoplesSheet.addRow(["ID", "Nom principal", "Famille linguistique", "Pays"]);
  for (const p of peoples) {
    peoplesSheet.addRow([
      p.id,
      p.nameMain,
      p.languageFamilyId,
      p.currentCountries.join(", "),
    ]);
  }

  // Pays
  const countriesSheet = workbook.addWorksheet("Pays");
  countriesSheet.addRow(["ID", "Nom (FR)", "Étymologie"]);
  for (const c of countries) {
    countriesSheet.addRow([c.id, c.nameFr, c.etymology || ""]);
  }

  // Relations
  const relationsSheet = workbook.addWorksheet("Relations");
  relationsSheet.addRow(["Peuple ID", "Pays ID"]);
  for (const p of peoples) {
    for (const countryId of p.currentCountries) {
      relationsSheet.addRow([p.id, countryId]);
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get("format") || "csv";

    if (format === "csv") {
      const buffer = await generateCSVZip();
      return applyCorsHeaders(
        new NextResponse(buffer, {
          status: 200,
          headers: {
            "Content-Type": "application/zip",
            "Content-Disposition":
              'attachment; filename="ethniafrique-atlas-v2.zip"',
          },
        })
      );
    } else if (format === "excel") {
      const buffer = await generateExcel();
      return applyCorsHeaders(
        new NextResponse(buffer, {
          status: 200,
          headers: {
            "Content-Type":
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition":
              'attachment; filename="ethniafrique-atlas-v2.xlsx"',
          },
        })
      );
    } else {
      return applyCorsHeaders(
        new NextResponse(
          JSON.stringify({ error: "Invalid format. Use 'csv' or 'excel'" }),
          { status: 400 }
        )
      );
    }
  } catch (error) {
    logger.error("Error generating download", error);
    return applyCorsHeaders(
      new NextResponse(
        JSON.stringify({ error: "Failed to generate download" }),
        { status: 500 }
      )
    );
  }
}

export async function OPTIONS() {
  return corsOptionsResponse();
}
