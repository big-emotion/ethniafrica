import { expect, test, type Page, type Response } from "@playwright/test";
import { getCountryRoute, getLocalizedRoute } from "@/lib/routing";
import { FACETS } from "@/lib/hubs/facets";

type RuntimeFailures = {
  scriptCsp: string[];
  scriptNetwork: string[];
  page: string[];
};

function captureRuntimeFailures(page: Page): RuntimeFailures {
  const failures: RuntimeFailures = {
    scriptCsp: [],
    scriptNetwork: [],
    page: [],
  };

  page.on("console", (message) => {
    if (message.type() !== "error") return;

    const text = message.text();
    if (/script-src|inline script|refused to execute/i.test(text)) {
      failures.scriptCsp.push(text);
    }
    if (/^Page error:|hydration failed|hydration mismatch/i.test(text)) {
      failures.page.push(text);
    }
  });
  page.on("response", (response) => {
    if (response.request().resourceType() === "script" && !response.ok()) {
      failures.scriptNetwork.push(`${response.status()} ${response.url()}`);
    }
  });
  page.on("requestfailed", (request) => {
    if (request.resourceType() === "script") {
      failures.scriptNetwork.push(
        `${request.failure()?.errorText ?? "request failed"} ${request.url()}`
      );
    }
  });
  page.on("pageerror", (error) => failures.page.push(error.message));

  return failures;
}

async function expectRequestNonceOnInlineScripts(
  page: Page,
  response: Response
) {
  const csp = response.headers()["content-security-policy"];
  expect(
    csp,
    "Expected a Content-Security-Policy response header"
  ).toBeTruthy();
  if (!csp) {
    throw new Error("Missing Content-Security-Policy response header");
  }

  const scriptSrc = csp
    .split(";")
    .map((directive) => directive.trim())
    .find((directive) => /^script-src(?:\s|$)/.test(directive));
  expect(scriptSrc).toBeDefined();
  expect(scriptSrc).not.toContain("'unsafe-inline'");

  const requestNonce = scriptSrc?.match(/'nonce-([^']+)'/)?.[1];
  expect(requestNonce, "Expected script-src to authorize a nonce").toBeTruthy();

  const inlineScriptNonces = await page
    .locator("script:not([src])")
    .evaluateAll((scripts) =>
      scripts
        .filter((script) => {
          const type = script.getAttribute("type");
          return (
            !type ||
            type === "module" ||
            type === "text/javascript" ||
            type === "application/javascript"
          );
        })
        .map((script) =>
          script instanceof HTMLScriptElement ? script.nonce : ""
        )
    );

  expect(inlineScriptNonces.length).toBeGreaterThan(0);
  expect(inlineScriptNonces).toEqual(
    Array(inlineScriptNonces.length).fill(requestNonce)
  );
}

async function expectDirectNavigation(
  page: Page,
  path: string,
  expectReady: () => Promise<void>,
  expectHydrated?: () => Promise<void>
) {
  const failures = captureRuntimeFailures(page);
  const response = await page.goto(path, { waitUntil: "domcontentloaded" });

  expect(response, `Expected a document response for ${path}`).not.toBeNull();
  if (!response) {
    throw new Error(`Missing document response for ${path}`);
  }
  expect(
    response.ok(),
    `Expected 2xx, got ${response.status()} on ${path}`
  ).toBe(true);

  try {
    await expectReady();
  } catch (error) {
    expect(failures.scriptCsp, `Script CSP violations on ${path}`).toEqual([]);
    expect(failures.scriptNetwork, `Script load failures on ${path}`).toEqual(
      []
    );
    expect(failures.page, `Page errors on ${path}`).toEqual([]);
    throw error;
  }
  await expect(page.getByText("Chargement...", { exact: true })).toHaveCount(0);

  const shortcutsDialog = page
    .getByRole("dialog")
    .filter({ hasText: "Raccourcis clavier" });
  await expect
    .poll(async () => {
      await page.evaluate(() => {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        document.dispatchEvent(
          new KeyboardEvent("keydown", { key: "?", bubbles: true })
        );
      });
      return shortcutsDialog.isVisible();
    })
    .toBe(true);
  await page.keyboard.press("Escape");
  await expect(shortcutsDialog).toBeHidden();

  if (expectHydrated) {
    await expectHydrated();
  }

  await expectRequestNonceOnInlineScripts(page, response);
  await page.waitForLoadState("networkidle");

  expect(failures.scriptCsp, `Script CSP violations on ${path}`).toEqual([]);
  expect(failures.scriptNetwork, `Script load failures on ${path}`).toEqual([]);
  expect(failures.page, `Page errors on ${path}`).toEqual([]);
}

// @req REQ-043
test.describe("@direct-navigation @cross-viewport nonce CSP", () => {
  // The three facets of the Explorer hub. Their headings are matched loosely
  // on the facet's own noun rather than pinned to a full title: the point here
  // is that the route hydrated under a nonce CSP, and an exact string turns
  // every piece of editorial rewording into a red CSP test. "Pays" and
  // "Peuples" were pinned exactly, and both broke the day the facets started
  // naming themselves "Les pays d'Afrique".
  const facets = FACETS.map((facet) => ({
    path: getLocalizedRoute("fr", facet.page),
    heading: new RegExp(facet.label, "i"),
  }));

  for (const facet of facets) {
    // @req REQ-001
    test(`hydrates the ${facet.path} facet after direct navigation`, async ({
      page,
    }) => {
      await expectDirectNavigation(page, facet.path, async () => {
        await expect(
          page.getByRole("heading", { level: 1, name: facet.heading })
        ).toBeVisible();
      });
    });
  }

  /**
   * `?country=` addressed a detail pane the countries facet no longer has, so
   * the route answers it with a 308 to the fiche. What this asserts now is
   * that the redirect lands and the fiche hydrates — the query is consumed on
   * the server, which is the point of answering it there rather than painting
   * a directory first.
   */
  // @req REQ-001
  test("forwards a query-string country deep link to that country's fiche", async ({
    page,
  }) => {
    await expectDirectNavigation(
      page,
      `${getLocalizedRoute("fr", "countries")}?country=COM`,
      async () => {
        await expect(
          page.getByRole("heading", { level: 1, name: /Comores/i })
        ).toBeVisible();
        expect(new URL(page.url()).pathname).toBe(getCountryRoute("fr", "COM"));
        expect(new URL(page.url()).searchParams.get("country")).toBeNull();
      }
    );
  });

  // @req REQ-002
  test("hydrates search state from a directly opened URL", async ({ page }) => {
    const searchbox = page.getByRole("searchbox");
    await expectDirectNavigation(
      page,
      `${getLocalizedRoute("fr", "search")}?q=Yoruba`,
      async () => {
        await expect(searchbox).toHaveValue("Yoruba");
      },
      async () => {
        const searchButton = page
          .getByRole("search", { name: "Formulaire de recherche" })
          .getByRole("button", { name: "Rechercher" });
        await searchbox.fill("Yoruba test");
        await searchButton.click();
        await expect
          .poll(() => new URL(page.url()).searchParams.get("q"))
          .toBe("Yoruba test");
      }
    );
  });

  // @req REQ-088
  test("hydrates a directly opened static-content page", async ({ page }) => {
    await expectDirectNavigation(
      page,
      "/fr/mentions-legales",
      async () => {
        await expect(
          page.getByRole("heading", { level: 1, name: "Mentions légales" })
        ).toBeVisible();
      },
      async () => {
        const rejectConsent = page.getByRole("button", { name: "Refuser" });
        if (await rejectConsent.isVisible()) {
          await rejectConsent.click();
          await expect(rejectConsent).toBeHidden();
        }
        await page.evaluate(() => {
          (
            window as typeof window & {
              __directNavigationMarker?: string;
            }
          ).__directNavigationMarker = "hydrated";
        });
        await page
          .getByRole("navigation", { name: "Informations légales" })
          .getByRole("link", { name: "Politique de données" })
          .click();
        await expect(
          page.getByRole("heading", { level: 1, name: "Politique de données" })
        ).toBeVisible();
        expect(new URL(page.url()).pathname).toBe("/fr/politique-de-donnees");
        expect(
          await page.evaluate(
            () =>
              (
                window as typeof window & {
                  __directNavigationMarker?: string;
                }
              ).__directNavigationMarker
          )
        ).toBe("hydrated");
      }
    );
  });

  // @req REQ-043
  test("hydrates the names feature after direct navigation", async ({
    page,
  }) => {
    await expectDirectNavigation(
      page,
      getLocalizedRoute("fr", "names"),
      async () => {
        await expect(
          page.getByRole("heading", { level: 1, name: "Noms & appellations" })
        ).toBeVisible();
        await expect(page.getByRole("searchbox")).toBeVisible();
      }
    );
  });

  // @req REQ-014
  test("hydrates public reports after direct navigation", async ({ page }) => {
    await expectDirectNavigation(page, "/fr/signalements", async () => {
      await expect(
        page.getByRole("heading", { level: 1, name: "Tous les signalements" })
      ).toBeVisible();
      await expect(
        page.getByRole("region", { name: "File publique des signalements" })
      ).toBeVisible();
    });
  });

  // @req REQ-001
  test("hydrates a canonical country detail after direct navigation", async ({
    page,
  }) => {
    await expectDirectNavigation(
      page,
      getCountryRoute("fr", "COM"),
      async () => {
        await expect(
          page.getByRole("heading", { level: 1, name: /Comores/i })
        ).toBeVisible();
      }
    );
  });

  // @req REQ-042
  test("keeps the anonymous protected-route redirect", async ({ page }) => {
    await expectDirectNavigation(page, "/fr/admin/cles-api", async () => {
      const url = new URL(page.url());
      expect(url.pathname).toBe("/fr/admin/connexion");
      expect(url.searchParams.get("redirect")).toBe("/fr/admin/cles-api");
      await expect(
        page.getByRole("heading", { level: 1, name: "Accès à la modération" })
      ).toBeVisible();
    });
  });
});
