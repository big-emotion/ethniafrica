import { readFileSync } from "fs";
import { resolve } from "path";

import { describe, expect, it } from "vitest";

const workflowPath = resolve(
  process.cwd(),
  ".github/workflows/deploy-production.yml"
);

function readWorkflow(): string {
  return readFileSync(workflowPath, "utf-8");
}

describe("production deploy workflow", () => {
  // Production's Postgres is self-hosted on the OVH VPS and its port is not
  // published: measured 2026-09-03, 145.239.76.125 answers on 443 and refuses
  // 5432 and 6543. The v4.1.1 deploy therefore read the ledger over PostgREST
  // and then died on `dial error (connect ECONNREFUSED …:5432)`. There is no
  // connection string that fixes that from a GitHub runner — the path has to
  // exist before the URL means anything.
  // @req REQ-032
  it("reaches the database through an SSH tunnel, not a published port", () => {
    const workflow = readWorkflow();

    expect(workflow).toContain("SUPABASE_OVH_SSH_KEY");
    expect(workflow).toContain("SUPABASE_OVH_SSH_KNOWN_HOSTS");

    // The far end is written 127.0.0.1 rather than localhost on purpose: the
    // compose file publishes the port on IPv4, and `localhost` on the remote
    // host can resolve to ::1 first, where nothing is listening.
    expect(workflow).toContain("-L 5432:127.0.0.1:5432");

    // Without this the forward can fail while ssh still exits 0, and `db push`
    // then connects to nothing on a port that looks open locally.
    expect(workflow).toContain("ExitOnForwardFailure=yes");
  });

  // The tunnel only ever listens on the runner's loopback, so a URL naming the
  // remote host bypasses it and reproduces the original failure. Asserting the
  // shape turns a 30-second connect timeout into an immediate, named error.
  // @req REQ-032
  it("requires a loopback database URL, since the tunnel is the only path", () => {
    const workflow = readWorkflow();

    // Both spellings are accepted, so both have to be in the case pattern.
    expect(workflow).toContain("localhost | 127.0.0.1)");
    expect(workflow).toContain("must point at the tunnel");
  });

  // The self-hosted Postgres does not offer TLS, and the Supabase CLI asks for
  // it: v4.2.0 opened the tunnel, reached `host=localhost`, and died on
  // "The server does not support SSL connections". Disabling it is right rather
  // than merely expedient — the bytes are already inside SSH, and the far end
  // is the VPS loopback.
  // @req REQ-032
  it("disables Postgres TLS, which the tunnel has already replaced", () => {
    const workflow = readWorkflow();

    expect(workflow).toContain("sslmode=disable");

    // Appended rather than assumed: a URL that already carries an sslmode is
    // left alone, so this cannot silently override a deliberate choice.
    expect(workflow).toContain("*sslmode=*)");
  });

  // The v4.2.0 plan step failed to connect and still passed: `db push | tee`
  // loses the exit code, `grep -c || true` then yields 0, and 0 is never
  // greater than the measurement. The gate only ever caught a plan that was too
  // wide — never one that never happened.
  // @req REQ-032
  it("fails the plan step when the dry run never reached the database", () => {
    const workflow = readWorkflow();

    expect(workflow).toContain("set -o pipefail");

    // A step that only runs when migrations are pending cannot legitimately
    // plan none of them.
    expect(workflow).toContain('"$PLANNED" -eq 0');
  });

  // The host key is pinned for the same reason the deploy job pins Gravelines':
  // an unpinned tunnel hands a database credential to whoever answers on that
  // address.
  // @req REQ-033
  it("pins the Supabase host key rather than trusting the address", () => {
    const workflow = readWorkflow();

    expect(workflow).not.toContain("StrictHostKeyChecking=no");
    expect(workflow).not.toContain("UserKnownHostsFile=/dev/null");
  });

  // The deploy still carries an SSH key and nothing else. Keeping the database
  // credential in the migrate job is what lets that stay true.
  // @req REQ-033
  it("keeps the database credential out of the deploy job", () => {
    const workflow = readWorkflow();

    const deployJob = workflow.slice(workflow.indexOf("\n  deploy:"));
    expect(deployJob).not.toContain("PRODUCTION_SUPABASE_DB_URL");
    expect(deployJob).not.toContain("SERVICE_ROLE_KEY");
  });
});
