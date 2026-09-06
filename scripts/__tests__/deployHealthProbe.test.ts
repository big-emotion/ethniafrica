import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { LOCALES } from "@/lib/locale";

/**
 * The liveness probe exists in two copies — the container's own HEALTHCHECK
 * and the post-deploy wait loop that reports on the rollout — and nothing
 * used to tie them together, which is the class of drift that once left a
 * runbook citing the wrong hostname for the right address. They both used to
 * name `/fr`, so the day English became the default (REQ-140) the probe
 * reported on the secondary locale of an English-default site. Probing the
 * root follows the redirect to whichever locale is the default, so neither
 * copy has to know.
 */

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

/** The `fetch(...)…` one-liner Node runs, without the shell quoting around it. */
const nodeProbe = (source: string, file: string): string => {
  const match = source.match(/fetch\('[^']*'\)\.then\([^)]*\)\)/);
  expect(match, `${file} carries no fetch probe`).not.toBeNull();
  return match![0];
};

const localeSegment = new RegExp(`/(${LOCALES.join("|")})(?=/|'|"|\\s|$)`);

describe("deploy liveness probes", () => {
  // @req REQ-140
  it("probes the default locale through the root redirect, from one probe string", () => {
    const dockerProbe = nodeProbe(read("Dockerfile"), "Dockerfile");
    const deployProbe = nodeProbe(
      read(".github/workflows/deploy-production.yml"),
      "deploy-production.yml"
    );

    expect(deployProbe).toBe(dockerProbe);
    expect(dockerProbe).toContain("http://127.0.0.1:3000/'");
    expect(dockerProbe).not.toMatch(localeSegment);
  });

  // The rollout message used to say "never answered on /fr", which reads as
  // a locale being down when what is down is the container.
  // @req REQ-140
  it("reports a failed rollout without naming a locale", () => {
    const workflow = read(".github/workflows/deploy-production.yml");
    const failureLine = workflow
      .split("\n")
      .find((line) => line.includes("never answered"));

    expect(failureLine).toBeDefined();
    expect(failureLine).not.toMatch(localeSegment);
  });

  // `curl -f` fails on the 307 the root answers with, so the readiness loop
  // has to follow it or the job waits a minute and reports the app never came
  // up.
  // @req REQ-140
  it("waits for the e2e server on the root and follows its redirect", () => {
    const workflow = read(".github/workflows/e2e.yml");
    const curlLine = workflow
      .split("\n")
      .find((line) => /curl .*localhost:3000/.test(line));

    expect(curlLine).toBeDefined();
    expect(curlLine).toMatch(/curl -fsSL http:\/\/localhost:3000\//);
    expect(curlLine).not.toMatch(localeSegment);
  });
});
