import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import type { User } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "./support/clients/supabase-admin";

const INBUCKET_BASE = process.env.INBUCKET_URL ?? "http://localhost:54324";
const IRREVERSIBLE_WARNING =
  "cette action est irréversible — vos signalements resteront publics sans votre nom";

function assertLocalSupabaseTarget(): void {
  const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!publicUrl) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL is required for contributor erasure E2E tests."
    );
  }

  const publicHostname = new URL(publicUrl).hostname;
  if (publicHostname !== "localhost" && publicHostname !== "127.0.0.1") {
    throw new Error(
      `Contributor erasure E2E tests only allow local Supabase, received ${publicHostname}.`
    );
  }

  const adminUrl = process.env.SUPABASE_URL ?? publicUrl;
  const adminHostname = new URL(adminUrl).hostname;
  if (adminHostname !== "localhost" && adminHostname !== "127.0.0.1") {
    throw new Error(
      `The Supabase admin client must target localhost, received ${adminHostname}.`
    );
  }
}

async function pollInbucket(
  emailAddress: string,
  timeoutMs = 20_000
): Promise<string> {
  const mailbox = emailAddress.split("@")[0];
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const mailboxResponse = await fetch(
      `${INBUCKET_BASE}/api/v1/mailbox/${mailbox}`
    );

    if (mailboxResponse.ok) {
      const messages: Array<{ id: string }> = await mailboxResponse.json();
      if (messages.length > 0) {
        const messageResponse = await fetch(
          `${INBUCKET_BASE}/api/v1/mailbox/${mailbox}/${messages[0].id}`
        );
        const message = await messageResponse.json();
        const body: string = message.body?.text ?? message.body?.html ?? "";
        const magicLink =
          body.match(/https?:\/\/\S+token_hash\S*/)?.[0] ??
          body.match(/https?:\/\/\S+/)?.[0];

        if (magicLink) {
          return magicLink.trim();
        }
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  throw new Error(
    `No magic-link email received for ${emailAddress} within ${timeoutMs}ms`
  );
}

// @req REQ-042
test("@cross-viewport contributor erasure preserves and anonymizes public flags", async ({
  page,
}, testInfo) => {
  assertLocalSupabaseTarget();

  const admin = getSupabaseAdmin();
  const testEmail = `e2e-erasure-${testInfo.project.name}-${randomUUID()}@example.com`;
  let userId: string | null = null;
  let flagId: string | null = null;

  try {
    await page.goto("/fr/compte/inscription");
    await page.getByLabel("Adresse e-mail").fill(testEmail);
    await page
      .getByRole("checkbox", {
        name: /J'accepte de publier mes contributions/,
      })
      .check();
    await page
      .getByRole("checkbox", {
        name: /Je confirme avoir 16 ans ou plus/,
      })
      .check();
    await page.getByRole("button", { name: /lien magique/i }).click();
    await expect(page.getByRole("status")).toBeVisible();

    const magicLink = await pollInbucket(testEmail);
    await page.goto(magicLink);
    await expect(page).toHaveURL(/\/fr\/compte\/profil/, {
      timeout: 15_000,
    });

    const { data: usersData, error: usersError } =
      await admin.auth.admin.listUsers();
    expect(usersError).toBeNull();
    const user = (usersData?.users as User[] | undefined)?.find(
      (candidate) => candidate.email === testEmail
    );
    expect(user, "Auth user should exist after registration").toBeTruthy();
    const contributorId = user?.id;
    if (!contributorId) {
      throw new Error("Auth user should exist after registration");
    }
    userId = contributorId;

    await page.getByLabel("Nom d’affichage").fill("Amina E2E");
    const publicProfileSwitch = page.getByRole("switch", {
      name: "Profil public",
    });
    await publicProfileSwitch.click();
    await expect(publicProfileSwitch).toBeChecked();
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByRole("status")).toHaveText("Profil mis à jour.");

    const createResponse = await page.request.post("/api/v2/flags", {
      data: {
        entity_type: "people",
        entity_id: `PPL_E2E_${randomUUID()}`,
        flag_kind: "other",
        reason_text: "Contributor erasure E2E flag",
      },
    });
    expect(createResponse.status()).toBe(201);

    const createPayload: { data?: { id?: string } } =
      await createResponse.json();
    const createdFlagId = createPayload.data?.id;
    if (!createdFlagId) {
      throw new Error("Created flag ID should be returned by the API");
    }
    flagId = createdFlagId;

    const { data: createdFlag, error: createdFlagError } = await admin
      .from("flags")
      .select("public_slug")
      .eq("id", createdFlagId)
      .single();
    expect(createdFlagError).toBeNull();
    expect(createdFlag?.public_slug).toBeTruthy();
    const publicSlug = createdFlag?.public_slug;
    if (!publicSlug) {
      throw new Error("Created flag should have a public slug");
    }

    await page.goto(`/fr/signalements/${publicSlug}`);
    await expect(page.getByTestId("contributor-name")).toContainText(
      "Amina E2E"
    );

    await page.goto("/fr/compte/profil");
    await page.getByRole("button", { name: "Supprimer mon compte" }).click();
    await expect(
      page.getByText(IRREVERSIBLE_WARNING, { exact: true })
    ).toBeVisible();
    await page
      .getByLabel("Saisissez SUPPRIMER pour confirmer")
      .fill("SUPPRIMER");
    await page
      .getByRole("button", { name: "Supprimer définitivement" })
      .click();
    await expect(page).toHaveURL(/\/fr\/?$/, { timeout: 15_000 });

    const { data: usersAfterErasure, error: usersAfterErasureError } =
      await admin.auth.admin.listUsers();
    expect(usersAfterErasureError).toBeNull();
    const remainingUsers = usersAfterErasure?.users as User[] | undefined;
    expect(
      remainingUsers?.some((candidate) => candidate.id === contributorId)
    ).toBe(false);

    const { data: profileAfterErasure, error: profileAfterErasureError } =
      await admin
        .from("contributor_profiles")
        .select("id")
        .or(`id.eq.${contributorId},user_id.eq.${contributorId}`)
        .maybeSingle();
    expect(profileAfterErasureError).toBeNull();
    expect(profileAfterErasure).toBeNull();

    const { data: flagAfterErasure, error: flagAfterErasureError } = await admin
      .from("flags")
      .select("id, contributor_id, contributor_display_name_snapshot")
      .eq("id", createdFlagId)
      .single();
    expect(flagAfterErasureError).toBeNull();
    expect(flagAfterErasure).toEqual({
      id: createdFlagId,
      contributor_id: null,
      contributor_display_name_snapshot: null,
    });

    await page.goto(`/fr/signalements/${publicSlug}`);
    await expect(page.getByTestId("contributor-name")).toContainText(
      "contributeur anonyme"
    );
  } finally {
    assertLocalSupabaseTarget();

    if (flagId) {
      await admin.from("flags").delete().eq("id", flagId);
    }

    if (userId) {
      await admin
        .from("contributor_profiles")
        .delete()
        .or(`id.eq.${userId},user_id.eq.${userId}`);
      await admin.auth.admin.deleteUser(userId);
    }
  }
});
