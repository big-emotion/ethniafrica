/**
 * Seeds essential-only consent before Lighthouse audits a URL, so the run
 * measures a returning reader rather than one staring at a consent banner.
 *
 * Two things this deliberately does not do:
 *
 * `waitUntil: "networkidle0"` — it waited for *zero* in-flight requests for
 * 500 ms, which a page with streamed RSC payloads never reaches. The wait
 * burned the full 30 s timeout and threw, and because lhci aborts collection
 * on the first URL that fails, every route after it went unmeasured. The
 * budgets were not failing; they were never evaluated. Seeding localStorage
 * only needs a document with an origin, which `domcontentloaded` gives.
 *
 * Throwing on failure — a seed that does not land is worth a warning and a
 * slightly pessimistic score for that one route. It is not worth silently
 * dropping the budget for every route that follows, which is what the
 * previous behaviour did and what `.lighthouserc.js` warns about in its own
 * comments: an unmeasured route is a budget nobody enforces.
 */
const NAVIGATION_TIMEOUT_MS = 30_000;

const CONSENT_STATE = {
  hasConsented: true,
  preferences: { essential: true, analytics: false, functional: false },
};

module.exports = async function prepareLighthouseSession(browser, { url }) {
  const page = await browser.newPage();

  try {
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: NAVIGATION_TIMEOUT_MS,
    });
    await page.evaluate(
      (consentState) => {
        localStorage.setItem("ethni-consent", JSON.stringify(consentState));
      },
      { ...CONSENT_STATE, consentDate: new Date().toISOString() }
    );
  } catch (error) {
    console.warn(
      `[lighthouse-setup] could not seed consent for ${url}: ${error.message}. ` +
        `Auditing it anyway — a pessimistic score beats an unmeasured route.`
    );
  } finally {
    await page.close();
  }
};
