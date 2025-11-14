import { NextRequest, NextResponse } from "next/server";
import archiver from "archiver";
import * as XLSX from "xlsx";
import { corsOptionsResponse } from "@/lib/api/cors";
import {
  getRegions,
  getAllCountries,
  getTotalPopulationAfrica,
  getCountryDetails,
} from "@/lib/api/datasetLoader.server";

// Générer un fichier CSV pour un pays
function generateCountryCSV(
  countryName: string,
  regionName: string,
  ethnicities: Array<{
    name: string;
    population: number;
    percentageInCountry: number;
    percentageInRegion: number;
    percentageInAfrica: number;
  }>
): string {
  const headers = [
    "Ethnicity_or_Subgroup",
    "pourcentage dans la population du pays",
    "population de l'ethnie estimée dans le pays",
    "pourcentage dans la population totale d'Afrique",
  ];

  const rows = ethnicities.map((eth) => [
    eth.name,
    eth.percentageInCountry.toFixed(2),
    eth.population.toString(),
    eth.percentageInAfrica.toFixed(4),
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n");
  return csvContent;
}

// Charger toutes les données pour Excel
async function loadAllDataForExcel() {
  const workbook = XLSX.utils.book_new();

  // Charger les données depuis Supabase
  const totalPopulation = await getTotalPopulationAfrica();
  const regions = await getRegions();
  const allCountries = await getAllCountries();

  // Feuille 1: Index / Résumé
  const summaryData: (string | number)[][] = [
    ["Total Population of Africa", totalPopulation],
    ["Number of Regions", regions.length],
    ["Number of Countries", allCountries.length],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

  // Feuille par région
  for (const region of regions) {
    const regionName = region.data.name;
    const countriesInRegion = allCountries.filter(
      (c) => c.region === region.key
    );

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

    for (const country of countriesInRegion) {
      regionRows.push([
        country.name,
        country.data.population,
        country.data.percentageInRegion.toFixed(2),
        country.data.percentageInAfrica.toFixed(2),
        country.data.ethnicityCount,
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

// Générer tous les fichiers CSV depuis Supabase
async function generateAllCSVFiles(): Promise<
  Array<{ path: string; content: string }>
> {
  const files: Array<{ path: string; content: string }> = [];
  const regions = await getRegions();

  for (const region of regions) {
    const countries = await getAllCountries();
    const countriesInRegion = countries.filter((c) => c.region === region.key);

    for (const country of countriesInRegion) {
      const countryDetails = await getCountryDetails(region.key, country.name);
      if (countryDetails) {
        const csvContent = generateCountryCSV(
          countryDetails.name,
          countryDetails.region,
          countryDetails.ethnicities
        );
        files.push({
          path: `${region.key}/${country.name}/groupes_ethniques.csv`,
          content: csvContent,
        });
      }
    }
  }

  return files;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get("format") || "csv";

    if (format === "csv") {
      // Générer un ZIP avec tous les fichiers CSV depuis Supabase
      const csvFiles = await generateAllCSVFiles();

      // Créer un stream pour le ZIP
      const archive = archiver("zip", {
        zlib: { level: 9 }, // Compression maximale
      });

      // Ajouter tous les fichiers CSV au ZIP
      for (const file of csvFiles) {
        archive.append(file.content, { name: file.path });
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
