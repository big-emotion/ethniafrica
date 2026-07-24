import { test, expect } from "@playwright/test";
import type { User } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "./support/clients/supabase-admin";

// Inbucket REST API base — matches supabase/config.toml inbucket.port = 54324
const INBUCKET_BASE = process.env.INBUCKET_URL ?? "http://localhost:54324";

async function pollInbucket(
  emailAddress: string,
  timeoutMs = 20_000
): Promise<string> {
  const mailbox = emailAddress.split("@")[0];
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(`${INBUCKET_BASE}/api/v1/mailbox/${mailbox}`);
    if (res.ok) {
      const messages: Array<{ id: string }> = await res.json();
      if (messages.length > 0) {
        const msgRes = await fetch(
          `${INBUCKET_BASE}/api/v1/mailbox/${mailbox}/${messages[0].id}`
        );
        const msg = await msgRes.json();
        // Extract the magic-link URL from plain text body
        const body: string = msg.body?.text ?? msg.body?.html ?? "";
        const match = body.match(/https?:\/\/\S+token_hash\S*/);
        if (match) return match[0].trim();
        // Fallback: first http link
        const fallback = body.match(/https?:\/\/\S+/);
        if (fallback) return fallback[0].trim();
      }
    }
    await new Promise((r) => setTimeout(r, 1_000));
  }
  throw new Error(
    `No magic-link email received for ${emailAddress} within ${timeoutMs}ms`
  );
}

test.describe("@contributor-auth — magic-link registration flow", () => {
  const testEmail = `e2e-contributor-${Date.now()}@example.com`;

  test.afterAll(async () => {
    // Clean up the test user from Supabase Auth and contributor_profiles
    try {
      const admin = getSupabaseAdmin();
      const { data: usersData } = await admin.auth.admin.listUsers();
      const user = (usersData?.users as User[] | undefined)?.find(
        (u) => u.email === testEmail
      );
      if (user) {
        await admin.auth.admin.deleteUser(user.id);
      }
    } catch {
      // Non-fatal: test isolation is best-effort
    }
  });

  test("registers via magic-link and lands on profile page with contributor_profiles row", async ({
    page,
  }) => {
    // 1. Navigate to registration page
    await page.goto("/fr/compte/inscription");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // 2. Fill email
    await page.getByLabel("Adresse e-mail").fill(testEmail);

    // 3. Accept CC-BY-SA consent
    await page.getByRole("checkbox").check();

    // 4. Submit magic-link form
    await page.getByRole("button", { name: /lien magique/i }).click();

    // 5. Confirm "check your inbox" feedback is visible
    await expect(page.getByRole("status")).toBeVisible({ timeout: 10_000 });

    // 6. Poll Inbucket for the verification email and follow the link
    const magicLink = await pollInbucket(testEmail);
    await page.goto(magicLink);

    // 7. After following the magic-link the callback redirects to /fr/compte/profil
    await expect(page).toHaveURL(/\/fr\/compte\/profil/, { timeout: 15_000 });

    // 8. Assert contributor_profiles row was created via admin client
    const admin = getSupabaseAdmin();
    const { data: usersData } = await admin.auth.admin.listUsers();
    const user = (usersData?.users as User[] | undefined)?.find(
      (u) => u.email === testEmail
    );
    expect(user, "Auth user should exist after registration").toBeTruthy();

    const { data: profile, error } = await admin
      .from("contributor_profiles")
      .select("id, display_name")
      .eq("id", user!.id)
      .single();

    expect(error, "contributor_profiles query should not error").toBeNull();
    expect(profile?.id).toBe(user!.id);
    expect(profile?.display_name).toBeTruthy();
  });
});
