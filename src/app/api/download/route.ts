import { NextRequest, NextResponse } from "next/server";
import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";
import archiver from "archiver";
import * as XLSX from "xlsx";
import { corsOptionsResponse } from "@/lib/api/cors";
import { DatasetIndex, RegionData, CountryData } from "@/types/ethnicity";

function getDatasetPath(): string {
  if (process.env.NODE_ENV === "production") {
    return join(process.cwd(), "public", "dataset");
  }
  return join(process.cwd(), "dataset", "result");
}

// Fonction récursive pour trouver tous les fichiers CSV
function findCSVFiles(
  dir: string,
  baseDir: string
): Array<{ path: string; relativePath: string }> {
  const files: Array<{ path: string; relativePath: string }> = [];

  try {
    const entries = readdirSync(dir);

    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        files.push(...findCSVFiles(fullPath, baseDir));
      } else if (entry.endsWith(".csv")) {
        const relativePath = fullPath.replace(baseDir + "/", "");
        files.push({ path: fullPath, relativePath });
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
  }

  return files;
}

// Charger toutes les données pour Excel
async function loadAllDataForExcel() {
  const datasetPath = getDatasetPath();
  const indexPath = join(datasetPath, "index.json");
  const index = JSON.parse(readFileSync(indexPath, "utf-8")) as DatasetIndex;

  const workbook = XLSX.utils.book_new();

  // Feuille 1: Index / Résumé
  const summaryData: (string | number)[][] = [
    ["Total Population of Africa", index.totalPopulationAfrica],
    ["Number of Regions", Object.keys(index.regions).length],
    [
      "Number of Countries",
      Object.values(index.regions).reduce(
        (acc: number, region: RegionData) =>
          acc + Object.keys(region.countries).length,
        0
      ),
    ],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

  // Feuille par région
  for (const [regionKey, regionData] of Object.entries(index.regions) as [
    string,
    RegionData,
  ][]) {
    const regionName = regionData.name;
    const countries = regionData.countries;

    // Créer une feuille pour chaque région avec les pays
    const regionRows: (string | number)[][] = [
      [
        "Country",
        "Population",
        "% in Region",
        "% in Africa",
        "Ethnicity Count",
      ],
    ];

    for (const [countryName, countryData] of Object.entries(countries) as [
      string,
      CountryData,
    ][]) {
      regionRows.push([
        countryName,
        countryData.population,
        countryData.percentageInRegion.toFixed(2),
        countryData.percentageInAfrica.toFixed(2),
        countryData.ethnicityCount,
      ]);
    }

    const regionSheet = XLSX.utils.aoa_to_sheet(regionRows);
    XLSX.utils.book_append_sheet(
      workbook,
      regionSheet,
      regionName.substring(0, 31)
    ); // Limite de 31 caractères pour les noms de feuilles
  }

  return workbook;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get("format") || "csv";

    if (format === "csv") {
      // Générer un ZIP avec tous les fichiers CSV
      const datasetPath = getDatasetPath();
      const csvFiles = findCSVFiles(datasetPath, datasetPath);

      // Créer un stream pour le ZIP
      const archive = archiver("zip", {
        zlib: { level: 9 }, // Compression maximale
      });

      // Ajouter tous les fichiers CSV au ZIP
      for (const file of csvFiles) {
        const fileContent = readFileSync(file.path);
        archive.append(fileContent, { name: file.relativePath });
      }

      // Convertir le stream en buffer
      const chunks: Buffer[] = [];

      archive.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });

      archive.on("error", (err) => {
        throw err;
      });

      archive.finalize();

      // Attendre la fin de l'archivage
      await new Promise<void>((resolve, reject) => {
        archive.on("end", () => resolve());
        archive.on("error", (err) => reject(err));
      });

      const buffer = Buffer.concat(chunks);

      const response = new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition":
            'attachment; filename="ethniafrique-atlas-data.zip"',
        },
      });

      // Appliquer les headers CORS
      response.headers.set("Access-Control-Allow-Origin", "*");
      response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
      response.headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization"
      );

      return response;
    } else if (format === "excel") {
      // Générer un fichier Excel
      const workbook = await loadAllDataForExcel();
      const excelBuffer = XLSX.write(workbook, {
        type: "buffer",
        bookType: "xlsx",
      });

      const response = new NextResponse(excelBuffer, {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition":
            'attachment; filename="ethniafrique-atlas-data.xlsx"',
        },
      });

      // Appliquer les headers CORS
      response.headers.set("Access-Control-Allow-Origin", "*");
      response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
      response.headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization"
      );

      return response;
    } else {
      const response = new NextResponse(
        JSON.stringify({ error: "Invalid format. Use 'csv' or 'excel'" }),
        {
          status: 400,
        }
      );
      response.headers.set("Access-Control-Allow-Origin", "*");
      response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
      response.headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization"
      );
      return response;
    }
  } catch (error) {
    console.error("Error generating download:", error);
    const response = new NextResponse(
      JSON.stringify({ error: "Failed to generate download" }),
      {
        status: 500,
      }
    );
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
    return response;
  }
}

export async function OPTIONS() {
  return corsOptionsResponse();
}
