#!/usr/bin/env tsx

import { createHash } from "node:crypto";
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { requirementAnnotations } from "./lintReqAnnotations";

export interface CanonicalRequirement {
  sourceId: string;
  statement: string;
}

export interface Requirement extends CanonicalRequirement {
  id: string;
}

export interface Decision {
  id: string;
  title: string;
  context: string;
  decision: string;
  alternatives: string;
  tradeoffs: string;
  requirementsSatisfied: string[];
  source: string;
  status: "Approved" | "Pending" | "Obsolete";
}

export interface ArchitectureContract {
  id: string;
  title: string;
  summary: string;
  sourceFiles: string[];
  tests: string[];
  source: string;
  status: "Approved" | "Pending" | "Obsolete";
}

export interface ObsoleteIntent {
  title: string;
  supersededBy: string;
  source: string;
  note: string;
}

export interface BootstrapCatalog {
  decisions: Decision[];
  architectures: ArchitectureContract[];
  obsolete: ObsoleteIntent[];
}

export interface CanonicalPageIds {
  requirements: string;
  decisions: string;
  architecture: string;
  obsolete: string;
}

interface ConfluenceSpecConfig {
  requirementsPageId?: string | null;
  decisionsPageId?: string | null;
  architecturePageId?: string | null;
  obsoletePageId?: string | null;
}

const SOURCE_REQUIREMENT_PATTERN = /^-\s+\*\*((?:FR|NFR)\d+):\*\*\s+(.+)$/gm;

function sourceOrder(identifier: string): [number, number] {
  return [
    identifier.startsWith("FR") ? 0 : 1,
    Number(identifier.replace(/\D/g, "")),
  ];
}

function html(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function statusMarkup(status: Decision["status"]): string {
  const color =
    status === "Approved" ? "green" : status === "Obsolete" ? "red" : "neutral";
  return `<span data-type="status" data-color="${color}">${status}</span>`;
}

function list(items: string[], code = false): string {
  if (items.length === 0) return "<p>None.</p>";
  return `<ul>${items
    .map(
      (item) => `<li>${code ? `<code>${html(item)}</code>` : html(item)}</li>`
    )
    .join("")}</ul>`;
}

export function extractCanonicalRequirements(
  markdown: string
): CanonicalRequirement[] {
  const requirements: CanonicalRequirement[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;
  SOURCE_REQUIREMENT_PATTERN.lastIndex = 0;
  while ((match = SOURCE_REQUIREMENT_PATTERN.exec(markdown))) {
    if (seen.has(match[1])) {
      throw new Error(`Duplicate canonical requirement source ID: ${match[1]}`);
    }
    seen.add(match[1]);
    requirements.push({ sourceId: match[1], statement: match[2].trim() });
  }

  return requirements.sort((left, right) => {
    const [leftKind, leftNumber] = sourceOrder(left.sourceId);
    const [rightKind, rightNumber] = sourceOrder(right.sourceId);
    return leftKind - rightKind || leftNumber - rightNumber;
  });
}

export function assignRequirementIds(
  requirements: CanonicalRequirement[]
): Requirement[] {
  return requirements.map((requirement, index) => ({
    id: `REQ-${String(index + 1).padStart(3, "0")}`,
    ...requirement,
  }));
}

export function renderRequirementsPage(
  requirements: Requirement[],
  traceability: Record<string, string[]>
): string {
  const sections = requirements.map((requirement) => {
    const tests = traceability[requirement.id] ?? [];
    const gwt =
      tests.length > 0
        ? [
            "<p><strong>GWT:</strong></p>",
            "<ul>",
            "<li>Given the implementation governed by this approved requirement</li>",
            "<li>When the automated tests anchoring the requirement execute</li>",
            "<li>Then they verify the observable behavior stated above</li>",
            "</ul>",
            "<p><strong>Tests anchoring this requirement:</strong></p>",
            list(tests, true),
          ].join("")
        : "<p><strong>GWT:</strong> TODO: GWT — no automated test currently references this requirement.</p>";

    return [
      `<h2>${requirement.id} — ${html(requirement.statement)}</h2>`,
      `<p><strong>Statement:</strong> ${html(requirement.statement)}</p>`,
      gwt,
      `<p><strong>Source:</strong> <code>_bmad-output/planning-artifacts/prd.md</code> (${requirement.sourceId})</p>`,
      `<p><strong>Status:</strong> ${statusMarkup("Approved")}</p>`,
      "<p><strong>Links → Jira:</strong> <em>Empty at bootstrap.</em></p>",
    ].join("");
  });

  return [
    "<h1>Requirements (REQ-NNN)</h1>",
    "<p>This page is the canonical requirements source for EthniAfrica. The one-shot bootstrap assigns stable IDs to the accepted PRD requirements. Status transitions are human-only in Confluence.</p>",
    "<hr>",
    sections.join("<hr>"),
  ].join("");
}

export function renderDecisionsPage(decisions: Decision[]): string {
  return [
    "<h1>Decisions (DEC-NNN)</h1>",
    "<p>This page records the canonical product and engineering decisions of EthniAfrica.</p>",
    "<hr>",
    decisions
      .map((entry) =>
        [
          `<h2>${entry.id} — ${html(entry.title)}</h2>`,
          `<p><strong>Status:</strong> ${statusMarkup(entry.status)}</p>`,
          `<p><strong>Context:</strong> ${html(entry.context)}</p>`,
          `<p><strong>Decision:</strong> ${html(entry.decision)}</p>`,
          `<p><strong>Alternatives:</strong> ${html(entry.alternatives)}</p>`,
          `<p><strong>Tradeoffs:</strong> ${html(entry.tradeoffs)}</p>`,
          "<p><strong>Requirements satisfied:</strong></p>",
          list(entry.requirementsSatisfied, true),
          `<p><strong>Source:</strong> <code>${html(entry.source)}</code></p>`,
        ].join("")
      )
      .join("<hr>"),
  ].join("");
}

export function renderArchitecturePage(
  contracts: ArchitectureContract[]
): string {
  return [
    "<h1>Architecture (ARCH-NNN)</h1>",
    "<p>This page records coarse-grained architecture contracts reconciled against the live repository.</p>",
    "<hr>",
    contracts
      .map((entry) =>
        [
          `<h2>${entry.id} — ${html(entry.title)}</h2>`,
          `<p><strong>Status:</strong> ${statusMarkup(entry.status)}</p>`,
          `<p><strong>Summary:</strong> ${html(entry.summary)}</p>`,
          "<p><strong>Source files (expected):</strong></p>",
          list(entry.sourceFiles, true),
          "<p><strong>Tests anchoring this contract:</strong></p>",
          list(entry.tests, true),
          `<p><strong>Source:</strong> <code>${html(entry.source)}</code></p>`,
        ].join("")
      )
      .join("<hr>"),
  ].join("");
}

export function renderObsoletePage(entries: ObsoleteIntent[]): string {
  return [
    "<h1>Obsolete</h1>",
    "<p>This page lists retired intents kept for historical context. Current state lives in Requirements, Decisions, and Architecture.</p>",
    "<hr>",
    entries
      .map((entry) =>
        [
          `<h2>${html(entry.title)} — Obsolete</h2>`,
          `<p><strong>Status:</strong> ${statusMarkup("Obsolete")}</p>`,
          `<p><strong>Superseded by:</strong> ${html(entry.supersededBy)}</p>`,
          `<p><strong>Source:</strong> <code>${html(entry.source)}</code></p>`,
          `<p><strong>Note:</strong> ${html(entry.note)}</p>`,
        ].join("")
      )
      .join("<hr>"),
  ].join("");
}

export function renderEngineeringIndex(pageIds: CanonicalPageIds): string {
  const base = "https://big-emotion.atlassian.net/wiki/spaces/ETHNIAFRIC/pages";
  return [
    "<h1>EthniAfrica — Engineering</h1>",
    "<p>This is the engineering source-of-truth tree for EthniAfrica. Intent flows from Confluence to code. Code, tests, and Jira tickets reference canonical IDs via <code>@req REQ-NNN</code>.</p>",
    "<p><strong>Canonical branches:</strong></p>",
    "<ul>",
    `<li><a href="${base}/${pageIds.requirements}">Requirements</a></li>`,
    `<li><a href="${base}/${pageIds.decisions}">Decisions</a></li>`,
    `<li><a href="${base}/${pageIds.architecture}">Architecture</a></li>`,
    `<li><a href="${base}/${pageIds.obsolete}">Obsolete</a></li>`,
    "</ul>",
    "<p>Ongoing changes use <code>/ethniafrica-spec</code>. Status transitions remain human-only in Confluence.</p>",
  ].join("");
}

export function resolveCanonicalPageIds(
  config: ConfluenceSpecConfig
): CanonicalPageIds {
  return {
    requirements: config.requirementsPageId ?? "__REQUIREMENTS_PAGE_ID__",
    decisions: config.decisionsPageId ?? "__DECISIONS_PAGE_ID__",
    architecture: config.architecturePageId ?? "__ARCHITECTURE_PAGE_ID__",
    obsolete: config.obsoletePageId ?? "__OBSOLETE_PAGE_ID__",
  };
}

function validateSequence(
  label: string,
  prefix: string,
  entries: Array<{ id: string }>
): string[] {
  return entries.flatMap((entry, index) => {
    const expected = `${prefix}-${String(index + 1).padStart(3, "0")}`;
    return entry.id === expected
      ? []
      : [
          `${label}: expected ${expected} at position ${index + 1}, found ${entry.id}`,
        ];
  });
}

export function validateBootstrapCatalog(catalog: BootstrapCatalog): string[] {
  const errors = [
    ...validateSequence("decisions", "DEC", catalog.decisions),
    ...validateSequence("architectures", "ARCH", catalog.architectures),
  ];
  const identifiers = [
    ...catalog.decisions.map((entry) => entry.id),
    ...catalog.architectures.map((entry) => entry.id),
  ];
  if (new Set(identifiers).size !== identifiers.length) {
    errors.push("bootstrap catalog contains duplicate identifiers");
  }
  return errors;
}

function collectTestFiles(root: string, directory = root): string[] {
  const output: string[] = [];
  for (const entry of readdirSync(directory)) {
    if (
      [
        ".git",
        ".next",
        ".claude",
        "bootstrap",
        "coverage",
        "node_modules",
      ].includes(entry)
    ) {
      continue;
    }
    const absolute = path.join(directory, entry);
    const stat = statSync(absolute);
    if (stat.isDirectory()) output.push(...collectTestFiles(root, absolute));
    else if (/\.(?:test|spec)\.(?:ts|tsx|js|jsx|mjs)$/.test(entry))
      output.push(absolute);
  }
  return output;
}

function collectTraceability(root: string): Record<string, string[]> {
  const output: Record<string, string[]> = {};
  for (const absolute of collectTestFiles(root)) {
    const relative = path.relative(root, absolute).replaceAll(path.sep, "/");
    const identifiers = requirementAnnotations(readFileSync(absolute, "utf8"));
    for (const identifier of identifiers) {
      output[identifier] ??= [];
      output[identifier].push(relative);
    }
  }
  return output;
}

function checksum(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function runCli(): void {
  const root = path.resolve(import.meta.dirname, "..");
  const prdPath = path.join(root, "_bmad-output/planning-artifacts/prd.md");
  const catalogPath = path.join(
    root,
    "docs/confluence-spec/bootstrap-catalog.json"
  );
  const configPath = path.join(root, "docs/confluence-spec/config.json");
  const catalog = JSON.parse(
    readFileSync(catalogPath, "utf8")
  ) as BootstrapCatalog;
  const config = JSON.parse(
    readFileSync(configPath, "utf8")
  ) as ConfluenceSpecConfig;
  const catalogErrors = validateBootstrapCatalog(catalog);
  if (catalogErrors.length > 0) {
    throw new Error(catalogErrors.join("\n"));
  }

  const requirements = assignRequirementIds(
    extractCanonicalRequirements(readFileSync(prdPath, "utf8"))
  );
  if (requirements.length !== 91) {
    throw new Error(
      `Expected 91 canonical requirements, found ${requirements.length}`
    );
  }

  const outputDirectory = path.join(root, "bootstrap/output");
  mkdirSync(outputDirectory, { recursive: true });
  const traceability = collectTraceability(root);
  const bodies = {
    requirements: renderRequirementsPage(requirements, traceability),
    decisions: renderDecisionsPage(catalog.decisions),
    architecture: renderArchitecturePage(catalog.architectures),
    obsolete: renderObsoletePage(catalog.obsolete),
    engineering: renderEngineeringIndex(resolveCanonicalPageIds(config)),
  };
  const pageIdsPublished = Object.values(resolveCanonicalPageIds(config)).every(
    (identifier) => !identifier.startsWith("__")
  );

  for (const [name, body] of Object.entries(bodies)) {
    writeFileSync(path.join(outputDirectory, `${name}.html`), `${body}\n`);
  }

  const requirementCatalog = {
    generatedFrom: "_bmad-output/planning-artifacts/prd.md",
    requirements: requirements.map((entry) => entry.id),
    sourceMap: Object.fromEntries(
      requirements.map((entry) => [entry.id, entry.sourceId])
    ),
  };
  writeFileSync(
    path.join(root, "docs/confluence-spec/req-catalog.json"),
    `${JSON.stringify(requirementCatalog, null, 2)}\n`
  );

  const report = [
    "# Confluence Bootstrap Migration Report",
    "",
    `- Requirements: ${requirements.length}`,
    `- Requirements with automated anchors: ${requirements.filter((entry) => (traceability[entry.id] ?? []).length > 0).length}`,
    `- Requirements awaiting an automated anchor: ${requirements.filter((entry) => (traceability[entry.id] ?? []).length === 0).length}`,
    `- Decisions: ${catalog.decisions.length}`,
    `- Pending decisions: ${catalog.decisions.filter((entry) => entry.status === "Pending").length}`,
    `- Architecture contracts: ${catalog.architectures.length}`,
    `- Pending architecture contracts: ${catalog.architectures.filter((entry) => entry.status === "Pending").length}`,
    `- Obsolete intents: ${catalog.obsolete.length}`,
    `- PRD SHA-256: \`${checksum(readFileSync(prdPath, "utf8"))}\``,
    `- Engineering SHA-256: \`${checksum(`${bodies.engineering}\n`)}\``,
    `- Requirements SHA-256: \`${checksum(`${bodies.requirements}\n`)}\``,
    `- Decisions SHA-256: \`${checksum(`${bodies.decisions}\n`)}\``,
    `- Architecture SHA-256: \`${checksum(`${bodies.architecture}\n`)}\``,
    `- Obsolete SHA-256: \`${checksum(`${bodies.obsolete}\n`)}\``,
    "",
    "## Explicit migration gaps",
    "",
    "- Requirements without a trustworthy automated anchor remain `TODO: GWT`; no coverage was fabricated.",
    "- DEC-008 stays Pending because the repository has no top-level code license file.",
    "- ARCH-007, ARCH-008, and ARCH-009 stay Pending until their documented auth/moderation, security/observability, and recovery contracts are fully verified.",
    "- The production build succeeds but swagger-jsdoc reports invalid Module #0 route annotations; ARCH-003 remains approved for the layered contract, while the annotation drift must be corrected separately.",
    pageIdsPublished
      ? "- Confluence page IDs are published and persisted in `docs/confluence-spec/config.json`."
      : "- Confluence page IDs remain unpublished until the hard approval gate is satisfied.",
    "",
    "No Confluence page has been created by this command.",
  ].join("\n");
  writeFileSync(
    path.join(outputDirectory, "migration-report.md"),
    `${report}\n`
  );
  console.log(report);
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(import.meta.filename)
) {
  runCli();
}
