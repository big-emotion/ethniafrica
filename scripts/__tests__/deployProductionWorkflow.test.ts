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

    // Without this the forward can fail while ssh still exits 0, and `db push`
    // then connects to nothing on a port that looks open locally.
    expect(workflow).toContain("ExitOnForwardFailure=yes");
  });

  // Host port 5432 on the VPS is Supavisor, not Postgres. Routing a migration
  // through a pooler buys nothing — `db push` opens one connection, runs DDL and
  // leaves — and it cost two failures: Supavisor demands a tenant identifier in
  // the username, then authenticates with a password copy seeded at first boot
  // that recreating the container does not refresh.
  // @req REQ-032
  it("forwards to the database container, not to the pooler on the host", () => {
    const workflow = readWorkflow();

    expect(workflow).toContain('-L "5432:$DB_IP:5432"');
    expect(workflow).toContain("docker inspect");

    // Docker assigns the address, so pinning one would break on the next
    // recreation of the container.
    expect(workflow).not.toContain("-L 5432:127.0.0.1:5432");
  });

  // Every deploy that failed on 2026-09-03 failed because a stored connection
  // string and the machine disagreed. The stack's own .env cannot be wrong about
  // itself, and the job already holds the SSH access needed to read it.
  // @req REQ-032
  it("builds the connection string from the stack's own env, holding no URL secret", () => {
    const workflow = readWorkflow();

    expect(workflow).toContain("POSTGRES_PASSWORD=");
    expect(workflow).toContain("::add-mask::");
    expect(workflow).not.toContain("secrets.PRODUCTION_SUPABASE_DB_URL");
  });

  // The self-hosted Postgres does not offer TLS, and the Supabase CLI asks for
  // it: v4.2.0 opened the tunnel, reached `host=localhost`, and died on
  // "The server does not support SSL connections". Disabling it is right rather
  // than merely expedient — the bytes are already inside SSH, and the far end
  // is the VPS loopback.
  // @req REQ-032
  it("disables Postgres TLS, which the tunnel has already replaced", () => {
    const workflow = readWorkflow();

    // Stated once, where the URL is built, rather than patched onto a string
    // someone else supplied.
    expect(workflow).toContain("?sslmode=disable");
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

    // Counted by a tested script. The inline grep it replaces looked for a line
    // starting with three digits while the CLI prefixes each entry with a
    // bullet, so it returned 0 on every release — this gate could never refuse
    // a plan for being too wide either.
    expect(workflow).toContain("scripts/ci/countPlannedMigrations.ts");
    expect(workflow).not.toContain("grep -cE");
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
