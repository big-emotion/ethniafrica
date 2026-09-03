import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// REQ-085 anchors the gates that must actually measure. A worktree without its
// own `node_modules` resolves upward into the main checkout, so `npm run
// build` and the Vitest suite can pass on a dependency the worktree never
// installs — a green that CI does not reproduce. Provisioning is what makes
// the local gate measure the worktree it claims to measure.

const SCRIPT = path.resolve(__dirname, "..", "setup-worktree.sh");

let mainCheckout: string;
let sandbox: string;

function git(cwd: string, ...args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf-8" });
}

function runSetup(
  cwd: string,
  options: { args?: string[]; stdin?: string } = {}
): { stdout: string; stderr: string } {
  const run = spawnSync("bash", [SCRIPT, ...(options.args ?? [])], {
    cwd,
    encoding: "utf-8",
    input: options.stdin ?? "",
  });
  if (run.status !== 0) {
    throw new Error(`setup-worktree.sh exited ${run.status}: ${run.stderr}`);
  }
  return { stdout: run.stdout, stderr: run.stderr };
}

/** A bare repo wired up as `origin`, so `origin/HEAD` becomes meaningful. */
function publishToOrigin(defaultBranch: string): void {
  const bare = path.join(sandbox, "origin.git");
  execFileSync("git", ["init", "--bare", "--initial-branch=main", bare]);
  git(mainCheckout, "remote", "add", "origin", bare);
  git(mainCheckout, "push", "-q", "origin", "main");
  git(mainCheckout, "branch", "recette");
  git(mainCheckout, "push", "-q", "origin", "recette");
  git(mainCheckout, "remote", "set-head", "origin", defaultBranch);
}

function addWorktree(name: string): string {
  const worktree = path.join(sandbox, name);
  git(mainCheckout, "worktree", "add", "-b", name, worktree);
  return worktree;
}

beforeEach(() => {
  sandbox = realpathSync(mkdtempSync(path.join(tmpdir(), "wt-setup-")));
  mainCheckout = path.join(sandbox, "main");
  mkdirSync(mainCheckout);

  git(mainCheckout, "init", "--initial-branch=main");
  git(mainCheckout, "config", "user.email", "test@example.com");
  git(mainCheckout, "config", "user.name", "test");
  writeFileSync(path.join(mainCheckout, ".gitignore"), "node_modules\n.env*\n");
  git(mainCheckout, "add", ".gitignore");
  git(mainCheckout, "commit", "-m", "init");

  mkdirSync(path.join(mainCheckout, "node_modules", "next"), {
    recursive: true,
  });
  writeFileSync(
    path.join(mainCheckout, "node_modules", "next", "package.json"),
    '{"name":"next"}\n'
  );
  writeFileSync(path.join(mainCheckout, ".env.local"), "SUPABASE_URL=x\n");
});

afterEach(() => {
  rmSync(sandbox, { recursive: true, force: true });
});

describe("setup-worktree.sh", () => {
  // @req REQ-085
  it("gives a fresh worktree its own node_modules cloned from the main checkout", () => {
    const worktree = addWorktree("feature");

    runSetup(worktree);

    const cloned = path.join(worktree, "node_modules", "next", "package.json");
    expect(existsSync(cloned)).toBe(true);
    expect(readFileSync(cloned, "utf-8")).toBe('{"name":"next"}\n');
  });

  // @req REQ-085
  it("copies the gitignored environment file the worktree cannot inherit", () => {
    const worktree = addWorktree("feature");

    runSetup(worktree);

    expect(readFileSync(path.join(worktree, ".env.local"), "utf-8")).toBe(
      "SUPABASE_URL=x\n"
    );
  });

  // @req REQ-085
  it("leaves an already-provisioned worktree untouched when run again", () => {
    const worktree = addWorktree("feature");
    mkdirSync(path.join(worktree, "node_modules"));
    writeFileSync(path.join(worktree, "node_modules", "sentinel"), "kept\n");
    writeFileSync(path.join(worktree, ".env.local"), "SUPABASE_URL=local\n");

    runSetup(worktree);

    expect(
      readFileSync(path.join(worktree, "node_modules", "sentinel"), "utf-8")
    ).toBe("kept\n");
    expect(readFileSync(path.join(worktree, ".env.local"), "utf-8")).toBe(
      "SUPABASE_URL=local\n"
    );
  });

  // @req REQ-085
  it("does nothing in the main checkout, which owns the real node_modules", () => {
    const { stdout } = runSetup(mainCheckout);

    expect(stdout).toMatch(/not a linked worktree/i);
    expect(
      existsSync(path.join(mainCheckout, "node_modules", "sentinel"))
    ).toBe(false);
  });

  // @req REQ-085
  it("provisions the worktree named on stdin when invoked as a hook from elsewhere", () => {
    const worktree = addWorktree("feature");

    runSetup(mainCheckout, {
      stdin: JSON.stringify({
        hook_event_name: "PostToolUse",
        cwd: worktree,
      }),
    });

    expect(
      existsSync(path.join(worktree, "node_modules", "next", "package.json"))
    ).toBe(true);
  });

  // @req REQ-085
  it("warns when the clone still branches new worktrees off main", () => {
    publishToOrigin("main");
    const worktree = addWorktree("feature");

    const { stderr } = runSetup(worktree);

    expect(stderr).toMatch(/origin\/main/);
    expect(stderr).toMatch(/remote set-head origin recette/);
  });

  // @req REQ-085
  it("stays quiet once the clone points at the integration branch", () => {
    publishToOrigin("recette");
    const worktree = addWorktree("feature");

    const { stderr } = runSetup(worktree);

    expect(stderr).toBe("");
  });

  // @req REQ-085
  it("points the worktree at the main checkout's git hooks so commits stay gated", () => {
    const hooksPath = path.join(mainCheckout, ".husky", "_");
    mkdirSync(hooksPath, { recursive: true });
    git(mainCheckout, "config", "core.hooksPath", ".husky/_");
    const worktree = addWorktree("feature");

    runSetup(worktree);

    expect(git(worktree, "config", "core.hooksPath").trim()).toBe(hooksPath);
  });
});
