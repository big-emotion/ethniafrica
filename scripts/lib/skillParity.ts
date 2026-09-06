import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  symlinkSync,
  unlinkSync,
} from "node:fs";
import { join, relative } from "node:path";

/**
 * The afrik-curator skill has one canonical copy, versioned under `.claude/`,
 * and one mirror entry point under `.agents/` for Codex. `.agents/` is ignored
 * by git as a runtime mirror, so the canonical side has to be the versioned one
 * — a tracked symlink pointing into an ignored directory would resolve to
 * nothing on a fresh clone.
 */
export const CANONICAL_SKILLS_DIR = ".claude/skills";
export const MIRROR_SKILLS_DIR = ".agents/skills";

/**
 * A backticked path counts as a skill resource only under these prefixes.
 * Without the restriction, `scripts/validateAfrikData.ts` — a repository path
 * the skill legitimately tells the reader to run — would be reported as a
 * missing skill file.
 */
const RESOURCE_PREFIXES = [
  "reference/",
  "references/",
  "templates/",
  "assets/",
];

export interface SkillManifest {
  label: string;
  exists: boolean;
  name: string | null;
  files: Record<string, string>;
  missingResources: string[];
}

export type SkillParityIssueKind =
  "missing-entry-point" | "name-mismatch" | "missing-file" | "content-mismatch";

export interface SkillParityIssue {
  kind: SkillParityIssueKind;
  path: string;
  detail: string;
}

export function parseSkillName(skillMarkdown: string): string | null {
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(skillMarkdown);
  if (!frontmatter) return null;

  const name = /^name:\s*(.+?)\s*$/m.exec(frontmatter[1]);
  return name ? name[1].replace(/^["']|["']$/g, "") : null;
}

export function collectReferencedResources(skillMarkdown: string): string[] {
  const backticked = skillMarkdown.match(/`([^`\n]+)`/g) ?? [];
  const referenced = backticked
    .map((token) => token.slice(1, -1).trim().split(/\s+/)[0])
    .filter((candidate) =>
      RESOURCE_PREFIXES.some((prefix) => candidate.startsWith(prefix))
    );

  return [...new Set(referenced)];
}

function markdownFilesRecursively(directory: string, base: string): string[] {
  return readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap((entry) => {
      const entryPath = join(directory, entry.name);
      if (entry.isDirectory()) return markdownFilesRecursively(entryPath, base);
      return entry.isFile() ? [relative(base, entryPath)] : [];
    });
}

export function readSkillManifest(
  projectRoot: string,
  skillsDir: string,
  skillName: string
): SkillManifest {
  const label = skillsDir === CANONICAL_SKILLS_DIR ? "canonical" : "mirror";
  const skillRoot = join(projectRoot, skillsDir, skillName);
  if (!existsSync(join(skillRoot, "SKILL.md"))) {
    return {
      label,
      exists: false,
      name: null,
      files: {},
      missingResources: [],
    };
  }

  // SKILL.md leads so a reader of the manifest sees the entry document first.
  const paths = markdownFilesRecursively(skillRoot, skillRoot).sort(
    (left, right) =>
      Number(right === "SKILL.md") - Number(left === "SKILL.md") ||
      left.localeCompare(right)
  );
  const files = Object.fromEntries(
    paths.map((path) => [path, readFileSync(join(skillRoot, path), "utf8")])
  );
  const missingResources = [
    ...new Set(Object.values(files).flatMap(collectReferencedResources)),
  ].filter((resource) => !existsSync(join(skillRoot, resource)));

  return {
    label,
    exists: true,
    name: parseSkillName(files["SKILL.md"]),
    files,
    missingResources,
  };
}

export function compareSkillManifests(
  canonical: SkillManifest,
  mirror: SkillManifest
): SkillParityIssue[] {
  if (!canonical.exists) {
    return [
      {
        kind: "missing-entry-point",
        path: "SKILL.md",
        detail: `${canonical.label} entry point does not exist`,
      },
    ];
  }

  // An absent mirror is the expected state of a fresh clone: `.agents/` is
  // gitignored, so it is provisioned by `npm run skills:link`, not by cloning.
  if (!mirror.exists) return [];

  const issues: SkillParityIssue[] = [];
  if (canonical.name !== mirror.name) {
    issues.push({
      kind: "name-mismatch",
      path: "SKILL.md",
      detail: `${canonical.label} declares name ${canonical.name}, ${mirror.label} declares ${mirror.name}`,
    });
  }

  const paths = [
    ...new Set([...Object.keys(canonical.files), ...Object.keys(mirror.files)]),
  ].sort();
  for (const path of paths) {
    const inCanonical = canonical.files[path];
    const inMirror = mirror.files[path];
    if (inCanonical === inMirror) continue;

    if (inCanonical === undefined || inMirror === undefined) {
      const present = inCanonical === undefined ? mirror : canonical;
      const absent = inCanonical === undefined ? canonical : mirror;
      issues.push({
        kind: "missing-file",
        path,
        detail: `${path} exists at ${present.label} but not at ${absent.label}`,
      });
      continue;
    }
    issues.push({
      kind: "content-mismatch",
      path,
      detail: `${canonical.label} and ${mirror.label} disagree on ${path}`,
    });
  }

  return issues;
}

export type LinkAction = "created" | "relinked" | "already-linked" | "blocked";

export interface LinkResult {
  action: LinkAction;
  target: string;
  detail: string;
}

export function linkMirrorSkill(
  projectRoot: string,
  skillName: string
): LinkResult {
  const canonicalPath = join(projectRoot, CANONICAL_SKILLS_DIR, skillName);
  const mirrorPath = join(projectRoot, MIRROR_SKILLS_DIR, skillName);
  const target = `${relative(join(projectRoot, MIRROR_SKILLS_DIR), join(projectRoot, CANONICAL_SKILLS_DIR))}/${skillName}`;

  if (!existsSync(join(canonicalPath, "SKILL.md"))) {
    return {
      action: "blocked",
      target,
      detail: `no canonical skill at ${CANONICAL_SKILLS_DIR}/${skillName}`,
    };
  }

  mkdirSync(join(projectRoot, MIRROR_SKILLS_DIR), { recursive: true });
  const standing = lstatSync(mirrorPath, { throwIfNoEntry: false });

  if (standing?.isSymbolicLink()) {
    if (readlinkSync(mirrorPath) === target) {
      return { action: "already-linked", target, detail: mirrorPath };
    }
    unlinkSync(mirrorPath);
    symlinkSync(target, mirrorPath);
    return { action: "relinked", target, detail: mirrorPath };
  }

  // A real directory here is hand-written content nobody asked us to discard.
  if (standing) {
    return {
      action: "blocked",
      target,
      detail: `${mirrorPath} is a real directory; move or delete it, then re-run`,
    };
  }

  symlinkSync(target, mirrorPath);
  return { action: "created", target, detail: mirrorPath };
}
