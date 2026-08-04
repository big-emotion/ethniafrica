module.exports = async function prepareLighthouseSession(browser, { url }) {
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: "networkidle0" });
    await page.evaluate(
      (consentState) => {
        localStorage.setItem("ethni-consent", JSON.stringify(consentState));
      },
      {
        hasConsented: true,
        preferences: {
          essential: true,
          analytics: false,
          functional: false,
        },
        consentDate: new Date().toISOString(),
      }
    );
  } finally {
    await page.close();
  }
};
