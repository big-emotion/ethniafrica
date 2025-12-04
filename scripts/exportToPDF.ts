import fs from "fs";
import path from "path";
import { marked } from "marked";
import puppeteer from "puppeteer";

/**
 * Convertit un fichier Markdown en PDF avec un style HTML élégant
 */
async function exportMarkdownToPDF(
  inputPath: string,
  outputPath: string
): Promise<void> {
  // Lire le fichier Markdown
  const markdownContent = fs.readFileSync(inputPath, "utf-8");

  // Convertir Markdown en HTML
  const htmlContent = await marked(markdownContent);

  // Créer le HTML complet avec styles
  const fullHTML = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Export PDF</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      background: #fff;
    }
    
    h1 {
      font-size: 2.5em;
      margin-bottom: 0.5em;
      color: #1a1a1a;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 0.3em;
      margin-top: 1em;
    }
    
    h2 {
      font-size: 1.8em;
      margin-top: 1.5em;
      margin-bottom: 0.8em;
      color: #1e40af;
      border-bottom: 2px solid #3b82f6;
      padding-bottom: 0.2em;
    }
    
    h3 {
      font-size: 1.4em;
      margin-top: 1.2em;
      margin-bottom: 0.6em;
      color: #1e3a8a;
    }
    
    h4 {
      font-size: 1.2em;
      margin-top: 1em;
      margin-bottom: 0.5em;
      color: #2563eb;
    }
    
    p {
      margin-bottom: 1em;
      text-align: justify;
    }
    
    ul, ol {
      margin-left: 2em;
      margin-bottom: 1em;
    }
    
    li {
      margin-bottom: 0.5em;
    }
    
    strong {
      color: #1e40af;
      font-weight: 600;
    }
    
    em {
      font-style: italic;
      color: #4b5563;
    }
    
    code {
      background-color: #f3f4f6;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
      color: #dc2626;
    }
    
    pre {
      background-color: #1f2937;
      color: #f9fafb;
      padding: 1em;
      border-radius: 6px;
      overflow-x: auto;
      margin-bottom: 1em;
    }
    
    pre code {
      background-color: transparent;
      color: inherit;
      padding: 0;
    }
    
    blockquote {
      border-left: 4px solid #3b82f6;
      padding-left: 1em;
      margin-left: 0;
      margin-bottom: 1em;
      color: #4b5563;
      font-style: italic;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 1em;
    }
    
    th, td {
      border: 1px solid #d1d5db;
      padding: 0.5em;
      text-align: left;
    }
    
    th {
      background-color: #3b82f6;
      color: white;
      font-weight: 600;
    }
    
    tr:nth-child(even) {
      background-color: #f9fafb;
    }
    
    hr {
      border: none;
      border-top: 2px solid #e5e7eb;
      margin: 2em 0;
    }
    
    @media print {
      body {
        padding: 20px;
      }
      
      h1, h2, h3 {
        page-break-after: avoid;
      }
      
      p, li {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>
  `;

  // Lancer Puppeteer et générer le PDF
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(fullHTML, { waitUntil: "networkidle0" });

    await page.pdf({
      path: outputPath,
      format: "A4",
      margin: {
        top: "20mm",
        right: "15mm",
        bottom: "20mm",
        left: "15mm",
      },
      printBackground: true,
    });

    console.log(`✓ PDF généré avec succès : ${outputPath}`);
  } finally {
    await browser.close();
  }
}

// Fonction principale
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error(
      "Usage: tsx scripts/exportToPDF.ts <fichier-input.txt> [fichier-output.pdf]"
    );
    process.exit(1);
  }

  const inputPath = path.resolve(args[0]);
  const outputPath =
    args[1] || inputPath.replace(/\.txt$/, ".pdf").replace(/\.md$/, ".pdf");

  if (!fs.existsSync(inputPath)) {
    console.error(`Erreur: Le fichier ${inputPath} n'existe pas.`);
    process.exit(1);
  }

  try {
    await exportMarkdownToPDF(inputPath, outputPath);
  } catch (error) {
    console.error("Erreur lors de la génération du PDF:", error);
    process.exit(1);
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  main();
}

export { exportMarkdownToPDF };
