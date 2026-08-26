import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";

/**
 * `createAdminClient` holds SUPABASE_SERVICE_ROLE_KEY, which bypasses every RLS
 * policy. A comment saying "server only" does not stop a client component from
 * importing it — `import "server-only"` does, by failing the build.
 *
 * The guarantee is a build-time one, so the assertion is static: at runtime
 * under happy-dom there is no client boundary to cross, and a test that imported
 * the module and watched nothing happen would prove nothing.
 */
const adminModule = fs.readFileSync(
  path.join(__dirname, "..", "admin.ts"),
  "utf8"
);

const importedModules = [
  ...adminModule.matchAll(/^import\s+.*?["']([^"']+)["']/gm),
].map((match) => match[1]);

describe("the service-role Supabase client", () => {
  // @req REQ-054
  it("cannot be pulled into a client bundle, because server-only fails the build first", () => {
    expect(importedModules).toContain("server-only");
  });

  // @req REQ-054
  it("declares the guard before anything that could pull the key in ahead of it", () => {
    expect(importedModules[0]).toBe("server-only");
  });
});
