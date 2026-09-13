import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

// The nightly quiz-bank job imports src/lib/supabase/admin.ts, whose
// `import "server-only"` throws outside a React Server environment. Vitest
// aliases that module to a stub, so every unit suite stayed green while the
// real `tsx` invocation crashed before reaching the database, night after
// night. This suite runs the generator the way the workflow does, minus the
// credentials, so the script stops at its dry-run guard once every module has
// loaded.
const workflow = readFileSync(
  resolve(process.cwd(), ".github/workflows/data-integrity.yml"),
  "utf8"
);

function quizJobNodeOptions(): string | undefined {
  const job = workflow.slice(workflow.indexOf("quiz-bank-integrity:"));
  const nextJob = job.slice(1).search(/\n {2}[a-z][\w-]*:\n/);
  const jobBody = nextJob === -1 ? job : job.slice(0, nextJob + 1);
  return jobBody.match(/NODE_OPTIONS:\s*"?([^"\n]+)"?/)?.[1];
}

describe("generateQuizQuestions module graph", () => {
  // @req REQ-080
  it("loads under the node options the nightly quiz-bank job passes", () => {
    const nodeOptions = quizJobNodeOptions();
    expect(nodeOptions).toContain("--conditions=react-server");

    // Empty credentials send the script down its dry-run branch, so nothing
    // after the imports can reach a database.
    const env = {
      ...process.env,
      NODE_OPTIONS: nodeOptions,
      NEXT_PUBLIC_SUPABASE_URL: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
    };

    const run = spawnSync(
      process.execPath,
      [
        resolve(process.cwd(), "node_modules/tsx/dist/cli.mjs"),
        "scripts/generateQuizQuestions.ts",
        "--check",
      ],
      { cwd: process.cwd(), env, encoding: "utf8" }
    );

    expect(run.stderr).not.toContain("server-only");
    expect(run.status).toBe(0);
    expect(`${run.stdout}${run.stderr}`).toContain("DRY RUN");
  }, 60_000);
});
